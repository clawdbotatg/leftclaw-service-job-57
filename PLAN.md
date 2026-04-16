# Build Plan — Job #57

## Client
0x7E6Db18aea6b54109f4E5F34242d4A8786E0C471

## Spec
BOSS_SLAYER — Cooperative CLAWD Raid Game. Build and deploy a BossSlayer.sol contract + frontend on Base. The community cooperates to burn CLAWD and kill an AI Boss. Players mint Slayer Licenses, attack the Boss spending CLAWD per hit, and when Boss HP hits zero the prize pool auto-splits four ways. Boss resets and repeats forever.

CONTRACT: BossSlayer.sol

OVERVIEW:
- Boss starts with configurable HP (suggest 100,000 for first boss)
- Players mint Slayer License NFT (ERC-1155 tokenId=0) to participate
- Players attack by spending CLAWD — each attack burns half and adds half to pot
- 5% crit chance on every attack deals 10x damage
- When HP hits zero, pot distributes automatically in four splits
- Owner injects a treasury bounty into each raid to make it positive-sum
- Boss resets with new HP for next raid

STATE:
- uint256 public bossHP — current remaining HP
- uint256 public bossMaxHP — set at raid start by owner
- uint256 public pot — total CLAWD in prize pool this raid
- uint256 public raidId — increments each raid
- mapping(address => uint256) public damageDealt — total HP damage per wallet this raid
- mapping(address => uint256) public attackCount — total attacks per wallet this raid
- address[] public attackers — unique attacker addresses this raid (for Reload split)
- address public finalBlowWallet — whoever lands the killing hit
- uint256 public attackNonce — increments on every attack for pseudo-randomness
- bool public raidActive — false while waiting for owner to start next raid

SLAYER LICENSE (ERC-1155):
- tokenId = 0, name Slayer License
- mintLicense() — public. Costs 5,000 CLAWD. Burns 25% (1,250 CLAWD) to address(0) immediately. Sends 75% (3,750 CLAWD) to pot. Mints 1 Slayer License NFT to caller. Caller must hold a license to attack. No limit on licenses per wallet. Emits LicenseMinted(caller, pot).

ATTACK:
- attack() — requires balanceOf(msg.sender, 0) >= 1 (holds Slayer License) and raidActive. Costs 200 CLAWD per call. Burns 100 CLAWD to address(0). Adds 100 CLAWD to pot. 
- Crit check: uint256 roll = uint256(keccak256(abi.encodePacked(blockhash(block.number-1), msg.sender, attackNonce))) % 100. If roll < 5: damage = 1000 (crit, 10x). Else: damage = 100. 
- Subtract damage from bossHP (floor at 0). Add damage to damageDealt[msg.sender]. Increment attackCount[msg.sender] and attackNonce. If msg.sender not in attackers array yet, push them. 
- If bossHP == 0 after this attack: set finalBlowWallet = msg.sender, call _settle(). 
- Emits Attack(raidId, msg.sender, damage, bossHP, isCrit).

SETTLEMENT (_settle, internal):
Called automatically when bossHP hits 0. Distributes pot in four splits:

1. RELOAD (30% of pot) — equal share to every unique attacker regardless of damage. pot * 30 / 100 / attackers.length per wallet.

2. HEAVY HITTERS (50% of pot) — pro-rata by damage dealt. Each attacker gets pot * 50 / 100 * damageDealt[attacker] / totalDamageDealt.

3. SNIPER (15% of pot) — entire amount to finalBlowWallet.

4. LUCKY DROP (5% of pot) — split among 5 randomly selected attackers. Random seed = keccak256(blockhash(block.number-1), raidId). Select 5 indices from attackers array using successive keccak256 hashes of the seed. If fewer than 5 unique attackers, split evenly among however many exist.

All four splits paid out via CLAWD transfers in the same _settle() call. Emits RaidComplete(raidId, pot, finalBlowWallet, attackers.length).

After settlement: raidActive = false. Owner must call startRaid(uint256 newHP) to begin next raid.

OWNER FUNCTIONS:
- injectBounty(uint256 amount) — owner only, raidActive. Transfers amount CLAWD from owner to pot. This external capital makes raids positive-sum despite burns. Emits BountyInjected(amount, pot).
- startRaid(uint256 newHP) — owner only, raidActive == false. Sets bossHP = newHP, bossMaxHP = newHP, raidActive = true, increments raidId, resets damageDealt/attackCount/attackers/finalBlowWallet. Owner should also call injectBounty after startRaid. Emits RaidStarted(raidId, newHP).

VIEW FUNCTIONS:
- getRaidInfo() — returns raidId, bossHP, bossMaxHP, pot, attackers.length, raidActive
- getLeaderboard() — returns top 10 attackers sorted by damageDealt (compute offchain from events, or store sorted array)
- getDamage(address wallet) — returns damageDealt[wallet] and attackCount[wallet] this raid

CLAWD token on Base: 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07. Burn to address(0).

FRONTEND:
Boss panel: animated Boss artwork with HP bar showing current/max HP. Boss art has three states — Healthy (>66% HP), Damaged (33-66%), Near Death (<33%). HP drains visually as attacks land. Show current pot size, raid ID, attacker count.

Attack panel: Attack button (costs 200 CLAWD, one click = one attack). Shows your damage dealt, attack count, estimated Reload share, estimated Heavy Hitter share. Green flash on crit, normal flash on regular hit. Crit announced in a feed.

Leaderboard: live top 10 damage dealers with damage amounts and estimated Heavy Hitter payout.

License panel: mint Slayer License button if wallet does not hold one. Shows license count held.

Live feed: scrolling log of recent attacks (wallet truncated, damage, crit or not, current boss HP).

Past raids panel: raidId, total pot, final blow wallet, number of attackers, total CLAWD burned that raid.

Stack: scaffold-eth 2, Next.js, wagmi/viem. Deploy frontend to Vercel.

Deploy contract to Base mainnet, verify on Basescan. Owner wallet: 0x7E6Db18aea6b54109f4E5F34242d4A8786E0C471. No proxy needed. After deploy, owner calls startRaid(100000) and injectBounty to open the first raid.

## Deploy
- Chain: Base (8453)
- RPC: Alchemy (ALCHEMY_API_KEY in .env)
- Deployer: 0x7a8b288AB00F5b469D45A82D4e08198F6Eec651C (DEPLOYER_PRIVATE_KEY in .env)
- All owner/admin/treasury roles transfer to client: 0x7E6Db18aea6b54109f4E5F34242d4A8786E0C471
