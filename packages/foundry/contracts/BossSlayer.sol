// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
/// @notice Known issue: Inheriting OZ Ownable exposes renounceOwnership(). If the client calls it,
///         startRaid() and injectBounty() become permanently inaccessible. No user funds are at risk
///         (an active raid still settles on kill); this is an operational risk accepted by the owner.
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title BossSlayer — Cooperative CLAWD Raid Game
/// @notice Community burns CLAWD to kill an AI Boss. Pot auto-splits four ways on kill, then the Boss resets.
contract BossSlayer is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Constants ---
    uint256 public constant LICENSE_ID = 0;
    uint256 public constant LICENSE_COST = 5_000 ether; // CLAWD has 18 decimals
    uint256 public constant LICENSE_BURN = 1_250 ether; // 25% burn
    uint256 public constant LICENSE_POT = 3_750 ether; // 75% to pot
    uint256 public constant ATTACK_COST = 200 ether;
    uint256 public constant ATTACK_BURN = 100 ether;
    uint256 public constant ATTACK_POT = 100 ether;
    uint256 public constant CRIT_CHANCE = 5; // percent
    uint256 public constant BASE_DAMAGE = 100;
    uint256 public constant CRIT_DAMAGE = 1_000;
    uint256 public constant LUCKY_DROP_WINNERS = 5;

    // --- Splits (basis percentages, sum to 100) ---
    uint256 public constant RELOAD_PCT = 30;
    uint256 public constant HEAVY_PCT = 50;
    uint256 public constant SNIPER_PCT = 15;
    uint256 public constant LUCKY_PCT = 5;

    // --- External ---
    IERC20 public immutable clawd;

    // --- Raid State ---
    uint256 public bossHP;
    uint256 public bossMaxHP;
    uint256 public pot;
    uint256 public raidId;
    uint256 public attackNonce;
    bool public raidActive;
    address public finalBlowWallet;
    uint256 public totalDamageDealt;

    mapping(address => uint256) public damageDealt;
    mapping(address => uint256) public attackCount;
    mapping(address => bool) private hasAttacked; // resets each raid
    address[] public attackers;

    // --- Commit-Reveal ---
    /// @dev Tracks a pending (committed but not yet revealed) attack for each player.
    struct PendingAttack {
        uint256 commitBlock;    // block in which commitAttack() was mined
        uint256 raidIdAtCommit; // raidId at commit time; used to detect stale reveals
    }
    /// @notice Returns the pending uncommitted attack for a player (commitBlock == 0 means none).
    mapping(address => PendingAttack) public pendingAttacks;

    // --- Events ---
    event LicenseMinted(address indexed wallet, uint256 pot);
    event AttackCommitted(uint256 indexed raidId, address indexed attacker, uint256 commitBlock);
    event Attack(
        uint256 indexed raidId, address indexed attacker, uint256 damage, uint256 bossHP, bool isCrit
    );
    event RaidStarted(uint256 indexed raidId, uint256 newHP);
    event RaidComplete(
        uint256 indexed raidId, uint256 pot, address indexed finalBlowWallet, uint256 attackerCount
    );
    event BountyInjected(uint256 amount, uint256 pot);
    event PayoutReload(uint256 indexed raidId, address indexed wallet, uint256 amount);
    event PayoutHeavy(uint256 indexed raidId, address indexed wallet, uint256 amount);
    event PayoutSniper(uint256 indexed raidId, address indexed wallet, uint256 amount);
    event PayoutLucky(uint256 indexed raidId, address indexed wallet, uint256 amount);

    // --- Errors ---
    error RaidNotActive();
    error RaidAlreadyActive();
    error NoLicense();
    error InvalidHP();
    error NoAttackersToStart();
    error AttackAlreadyPending();
    error NoAttackPending();
    error MustWaitOneBlock();

    constructor(address clawdToken, address initialOwner)
        ERC1155("")
        Ownable(initialOwner)
    {
        require(clawdToken != address(0), "clawd=0");
        require(initialOwner != address(0), "owner=0");
        clawd = IERC20(clawdToken);
    }

    // --- Metadata ---
    /// @notice Known issue: Slayer Licenses (ERC-1155 id 0) have no metadata URI; wallets and
    ///         marketplaces will show a blank NFT. Licenses are utility-only; the UI renders
    ///         their balance directly from contract state. A URI setter can be added in a future cycle.
    function uri(uint256) public pure override returns (string memory) {
        // Single-token collection. Static JSON URI could be added later by owner.
        return "";
    }

    function name() external pure returns (string memory) {
        return "Slayer License";
    }

    function symbol() external pure returns (string memory) {
        return "SLAYER";
    }

    // --- Public: License ---
    /// @notice Mint one Slayer License by paying LICENSE_COST CLAWD. 25% burned, 75% to pot.
    function mintLicense() external nonReentrant {
        // Pull full cost, then burn the burn portion. Pot portion stays in contract as the pot balance.
        clawd.safeTransferFrom(msg.sender, address(this), LICENSE_COST);
        clawd.safeTransfer(address(0xdead), LICENSE_BURN);
        pot += LICENSE_POT;
        _mint(msg.sender, LICENSE_ID, 1, "");
        emit LicenseMinted(msg.sender, pot);
    }

    // --- Public: Attack (commit-reveal) ---

    /// @notice Phase 1 — lock in your attack. CLAWD is taken immediately.
    /// @dev    The crit roll is resolved in revealAttack() using blockhash(commitBlock), which the
    ///         caller cannot know when broadcasting this transaction. This prevents selective-crit
    ///         front-running that would otherwise drain the Heavy Hitter pot disproportionately.
    ///         CLAWD is burned / potted here regardless of reveal outcome.
    function commitAttack() external nonReentrant {
        if (!raidActive) revert RaidNotActive();
        if (balanceOf(msg.sender, LICENSE_ID) == 0) revert NoLicense();
        if (pendingAttacks[msg.sender].commitBlock != 0) revert AttackAlreadyPending();

        clawd.safeTransferFrom(msg.sender, address(this), ATTACK_COST);
        clawd.safeTransfer(address(0xdead), ATTACK_BURN);
        pot += ATTACK_POT;

        pendingAttacks[msg.sender] = PendingAttack({ commitBlock: block.number, raidIdAtCommit: raidId });
        emit AttackCommitted(raidId, msg.sender, block.number);
    }

    /// @notice Phase 2 — resolve the crit roll using blockhash(commitBlock) and apply damage.
    /// @dev    Must be called at least 1 block after commitAttack() and within 255 blocks.
    ///         If the raid ended or restarted between commit and reveal the pending state is
    ///         cleared without crediting damage (CLAWD was already accounted for in the prior raid).
    ///         blockhash() returns 0 for blocks older than 256; calling after 255 blocks silently
    ///         discards the attack so the player is never permanently stuck.
    function revealAttack() external nonReentrant {
        PendingAttack memory pending = pendingAttacks[msg.sender];
        if (pending.commitBlock == 0) revert NoAttackPending();
        if (block.number == pending.commitBlock) revert MustWaitOneBlock();

        // Clear unconditionally — player must never be permanently stuck with a pending attack.
        delete pendingAttacks[msg.sender];

        // Expired: blockhash no longer available (>255 blocks elapsed). Silently drop.
        if (block.number > pending.commitBlock + 255) {
            return;
        }

        // Stale: raid ended or restarted after the commit. Silently drop.
        // CLAWD was already burned/potted and distributed with the previous raid's settlement.
        if (!raidActive || pending.raidIdAtCommit != raidId) {
            return;
        }

        bytes32 bhash = blockhash(pending.commitBlock);
        // bhash is guaranteed non-zero here because block.number <= pending.commitBlock + 255.

        uint256 nonce = attackNonce;
        uint256 roll = uint256(keccak256(abi.encodePacked(bhash, msg.sender, nonce))) % 100;
        bool isCrit = roll < CRIT_CHANCE;
        uint256 damage = isCrit ? CRIT_DAMAGE : BASE_DAMAGE;

        /// @notice Known issue: damageDealt credits full rolled damage including overkill; hpLoss
        ///         floors at 0. Intentional design: the finisher earns a bonus on the Heavy split
        ///         proportional to their final blow. Asymmetric but not a bug.
        uint256 hpLoss = damage > bossHP ? bossHP : damage;
        bossHP -= hpLoss;
        damageDealt[msg.sender] += damage;
        totalDamageDealt += damage;
        attackCount[msg.sender] += 1;
        attackNonce = nonce + 1;

        if (!hasAttacked[msg.sender]) {
            hasAttacked[msg.sender] = true;
            attackers.push(msg.sender);
        }

        emit Attack(raidId, msg.sender, damage, bossHP, isCrit);

        if (bossHP == 0) {
            finalBlowWallet = msg.sender;
            _settle();
        }
    }

    // --- Owner ---
    /// @notice Start a new raid. Resets per-raid state and bumps raidId.
    /// @notice Known issue: Settlement gas scales with unique-attacker count. startRaid() does a
    ///         full-length clear of the prior raid's state; _settle() runs three full-length loops
    ///         over attackers. The finisher pays settlement gas. Acceptable on Base at current game
    ///         scale (well within 30M block gas for thousands of unique attackers).
    function startRaid(uint256 newHP) external onlyOwner {
        if (raidActive) revert RaidAlreadyActive();
        if (newHP == 0) revert InvalidHP();

        // Clear previous attackers' hasAttacked map before overwriting the array.
        uint256 len = attackers.length;
        for (uint256 i = 0; i < len; i++) {
            address a = attackers[i];
            hasAttacked[a] = false;
            damageDealt[a] = 0;
            attackCount[a] = 0;
        }
        delete attackers;

        totalDamageDealt = 0;
        finalBlowWallet = address(0);
        bossHP = newHP;
        bossMaxHP = newHP;
        raidActive = true;
        raidId += 1;

        emit RaidStarted(raidId, newHP);
    }

    /// @notice Owner deposits CLAWD into the active raid pot to make it positive-sum.
    function injectBounty(uint256 amount) external onlyOwner nonReentrant {
        if (!raidActive) revert RaidNotActive();
        clawd.safeTransferFrom(msg.sender, address(this), amount);
        pot += amount;
        emit BountyInjected(amount, pot);
    }

    // --- Internal: Settlement ---
    function _settle() internal {
        uint256 settlePot = pot;
        uint256 rid = raidId;
        uint256 attackerCount = attackers.length;

        _payReload(rid, settlePot, attackerCount);
        _payHeavy(rid, settlePot, attackerCount);
        _paySniper(rid, settlePot);
        _payLucky(rid, settlePot, attackerCount);

        // Zero the pot and close the raid. Rounding dust stays in the contract as seed for the next pot.
        pot = 0;
        raidActive = false;

        emit RaidComplete(rid, settlePot, finalBlowWallet, attackerCount);
    }

    function _payReload(uint256 rid, uint256 settlePot, uint256 attackerCount) internal {
        if (attackerCount == 0) return;
        uint256 reloadTotal = (settlePot * RELOAD_PCT) / 100;
        uint256 reloadPer = reloadTotal / attackerCount;
        if (reloadPer == 0) return;
        for (uint256 i = 0; i < attackerCount; i++) {
            address w = attackers[i];
            clawd.safeTransfer(w, reloadPer);
            emit PayoutReload(rid, w, reloadPer);
        }
    }

    function _payHeavy(uint256 rid, uint256 settlePot, uint256 attackerCount) internal {
        uint256 heavyTotal = (settlePot * HEAVY_PCT) / 100;
        uint256 totalDmg = totalDamageDealt;
        if (heavyTotal == 0 || totalDmg == 0) return;
        for (uint256 i = 0; i < attackerCount; i++) {
            address w = attackers[i];
            uint256 share = (heavyTotal * damageDealt[w]) / totalDmg;
            if (share > 0) {
                clawd.safeTransfer(w, share);
                emit PayoutHeavy(rid, w, share);
            }
        }
    }

    function _paySniper(uint256 rid, uint256 settlePot) internal {
        uint256 sniper = (settlePot * SNIPER_PCT) / 100;
        address target = finalBlowWallet;
        if (sniper == 0 || target == address(0)) return;
        clawd.safeTransfer(target, sniper);
        emit PayoutSniper(rid, target, sniper);
    }

    /// @notice Known issue: Lucky Drop RNG uses the same blockhash-based seed weakness as the
    ///         former crit roll. The finisher can compute the lucky-winner set before landing the
    ///         killing blow and choose whether to proceed. Impact is capped at 5% of pot; acceptable
    ///         for v1. Bundle into the same VRF/commit-reveal extension if tightening in a future cycle.
    function _payLucky(uint256 rid, uint256 settlePot, uint256 attackerCount) internal {
        uint256 lucky = (settlePot * LUCKY_PCT) / 100;
        if (lucky == 0 || attackerCount == 0) return;
        uint256 winners = attackerCount < LUCKY_DROP_WINNERS ? attackerCount : LUCKY_DROP_WINNERS;
        uint256 luckyPer = lucky / winners;
        if (luckyPer == 0) return;
        bytes32 seed = keccak256(abi.encodePacked(blockhash(block.number - 1), rid));

        if (winners == attackerCount) {
            // Fewer unique attackers than winner slots — pay all of them.
            for (uint256 i = 0; i < attackerCount; i++) {
                address w = attackers[i];
                clawd.safeTransfer(w, luckyPer);
                emit PayoutLucky(rid, w, luckyPer);
            }
            return;
        }

        bool[] memory picked = new bool[](attackerCount);
        uint256 paid;
        uint256 salt;
        while (paid < winners) {
            uint256 idx = uint256(keccak256(abi.encodePacked(seed, salt))) % attackerCount;
            salt += 1;
            if (picked[idx]) continue;
            picked[idx] = true;
            address w = attackers[idx];
            clawd.safeTransfer(w, luckyPer);
            emit PayoutLucky(rid, w, luckyPer);
            paid += 1;
        }
    }

    // --- Views ---
    function getRaidInfo()
        external
        view
        returns (
            uint256 _raidId,
            uint256 _bossHP,
            uint256 _bossMaxHP,
            uint256 _pot,
            uint256 _attackerCount,
            bool _raidActive
        )
    {
        return (raidId, bossHP, bossMaxHP, pot, attackers.length, raidActive);
    }

    function getDamage(address wallet) external view returns (uint256 damage, uint256 count) {
        return (damageDealt[wallet], attackCount[wallet]);
    }

    function getAttackers() external view returns (address[] memory) {
        return attackers;
    }

    function attackersLength() external view returns (uint256) {
        return attackers.length;
    }

    /// @notice Top-N attackers by damage for this raid. O(attackers * N) — intended for small N (e.g. 10) and read-only use.
    function getLeaderboard(uint256 topN)
        external
        view
        returns (address[] memory wallets, uint256[] memory damages)
    {
        uint256 len = attackers.length;
        uint256 size = topN < len ? topN : len;
        wallets = new address[](size);
        damages = new uint256[](size);

        // Simple selection scan; O(len * size) is fine because topN is tiny.
        bool[] memory taken = new bool[](len);
        for (uint256 rank = 0; rank < size; rank++) {
            uint256 bestIdx = type(uint256).max;
            uint256 bestDmg;
            for (uint256 i = 0; i < len; i++) {
                if (taken[i]) continue;
                uint256 d = damageDealt[attackers[i]];
                if (bestIdx == type(uint256).max || d > bestDmg) {
                    bestDmg = d;
                    bestIdx = i;
                }
            }
            taken[bestIdx] = true;
            wallets[rank] = attackers[bestIdx];
            damages[rank] = bestDmg;
        }
    }
}
