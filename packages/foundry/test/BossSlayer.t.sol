// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { BossSlayer } from "../contracts/BossSlayer.sol";
import { Clawd } from "../contracts/Clawd.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract BossSlayerTest is Test {
    BossSlayer internal game;
    Clawd internal clawd;

    address internal owner = address(0xA11CE);
    address internal alice = address(0xBEEF1);
    address internal bob = address(0xBEEF2);
    address internal carol = address(0xBEEF3);

    address internal constant BURN_ADDRESS = address(0xdead);

    function setUp() public {
        clawd = new Clawd();
        game = new BossSlayer(address(clawd), owner);

        // fund participants
        address[3] memory players = [alice, bob, carol];
        for (uint256 i = 0; i < players.length; i++) {
            clawd.mint(players[i], 1_000_000 ether);
            vm.prank(players[i]);
            clawd.approve(address(game), type(uint256).max);
        }

        // fund owner for bounty
        clawd.mint(owner, 10_000_000 ether);
        vm.prank(owner);
        clawd.approve(address(game), type(uint256).max);
    }

    // --- Construction ---
    function test_constructor_setsClawdAndOwner() public view {
        assertEq(address(game.clawd()), address(clawd));
        assertEq(game.owner(), owner);
        assertEq(game.raidId(), 0);
        assertFalse(game.raidActive());
    }

    function test_constructor_rejectsZeroClawd() public {
        vm.expectRevert(bytes("clawd=0"));
        new BossSlayer(address(0), owner);
    }

    // --- License ---
    function test_mintLicense_burnsAndAddsToPot() public {
        vm.prank(alice);
        game.mintLicense();

        assertEq(game.balanceOf(alice, 0), 1);
        assertEq(clawd.balanceOf(BURN_ADDRESS), game.LICENSE_BURN());
        assertEq(game.pot(), game.LICENSE_POT());
        // Contract holds the pot portion.
        assertEq(clawd.balanceOf(address(game)), game.LICENSE_POT());
    }

    function test_mintLicense_multipleAllowed() public {
        vm.startPrank(alice);
        game.mintLicense();
        game.mintLicense();
        vm.stopPrank();
        assertEq(game.balanceOf(alice, 0), 2);
    }

    // --- Starting a raid ---
    function test_startRaid_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        game.startRaid(100_000);
    }

    function test_startRaid_zeroHPReverts() public {
        vm.prank(owner);
        vm.expectRevert(BossSlayer.InvalidHP.selector);
        game.startRaid(0);
    }

    function test_startRaid_alreadyActiveReverts() public {
        vm.startPrank(owner);
        game.startRaid(100_000);
        vm.expectRevert(BossSlayer.RaidAlreadyActive.selector);
        game.startRaid(50_000);
        vm.stopPrank();
    }

    function test_startRaid_incrementsId() public {
        vm.prank(owner);
        game.startRaid(100_000);
        assertEq(game.raidId(), 1);
        assertEq(game.bossHP(), 100_000);
        assertEq(game.bossMaxHP(), 100_000);
        assertTrue(game.raidActive());
    }

    // --- Attack ---
    function test_attack_requiresLicense() public {
        vm.prank(owner);
        game.startRaid(100_000);

        vm.prank(alice);
        vm.expectRevert(BossSlayer.NoLicense.selector);
        game.attack();
    }

    function test_attack_requiresActiveRaid() public {
        vm.prank(alice);
        game.mintLicense();

        vm.prank(alice);
        vm.expectRevert(BossSlayer.RaidNotActive.selector);
        game.attack();
    }

    function test_attack_burnsAndPotsAndDamages() public {
        vm.prank(owner);
        game.startRaid(100_000);

        vm.prank(alice);
        game.mintLicense();

        uint256 burnBefore = clawd.balanceOf(BURN_ADDRESS);
        uint256 potBefore = game.pot();

        vm.prank(alice);
        game.attack();

        assertEq(clawd.balanceOf(BURN_ADDRESS) - burnBefore, game.ATTACK_BURN());
        assertEq(game.pot() - potBefore, game.ATTACK_POT());
        (uint256 dmg, uint256 count) = game.getDamage(alice);
        assertGt(dmg, 0);
        assertEq(count, 1);
        assertEq(game.attackersLength(), 1);
    }

    function test_attack_critPossible() public {
        // Find a block/nonce combination that yields a crit. We march through many blocks to hit the 5% crit.
        vm.prank(owner);
        game.startRaid(10_000_000); // big HP to keep raid alive through many attacks

        vm.prank(alice);
        game.mintLicense();

        bool sawCrit;
        for (uint256 i = 0; i < 200; i++) {
            vm.roll(block.number + 1);
            vm.prank(alice);
            game.attack();
            (uint256 dmg,) = game.getDamage(alice);
            if (dmg >= game.CRIT_DAMAGE()) {
                sawCrit = true;
                break;
            }
        }
        assertTrue(sawCrit, "should see a crit within 200 attempts");
    }

    // --- Settlement ---
    function test_fullRaidSettlement_fourSplitsPayOut() public {
        vm.prank(owner);
        game.startRaid(1_000); // small HP so we kill quickly

        // Two attackers mint licenses
        vm.prank(alice);
        game.mintLicense();
        vm.prank(bob);
        game.mintLicense();

        // Owner injects a bounty so payouts are positive-sum
        vm.prank(owner);
        game.injectBounty(1_000_000 ether);

        uint256 aliceBalBefore = clawd.balanceOf(alice);
        uint256 bobBalBefore = clawd.balanceOf(bob);

        // Burn through the boss. Keep attacking until raid closes.
        uint256 safety;
        while (game.raidActive() && safety < 500) {
            vm.roll(block.number + 1);
            vm.prank(alice);
            game.attack();
            if (!game.raidActive()) break;
            vm.roll(block.number + 1);
            vm.prank(bob);
            game.attack();
            safety++;
        }
        assertFalse(game.raidActive(), "raid should have ended");
        assertEq(game.bossHP(), 0);

        uint256 aliceGain = clawd.balanceOf(alice) - aliceBalBefore;
        uint256 bobGain = clawd.balanceOf(bob) - bobBalBefore;

        // Each attacker should have received something (reload + heavy + maybe sniper/lucky)
        assertGt(aliceGain, 0);
        assertGt(bobGain, 0);

        // Pot is reset to 0 after settlement
        assertEq(game.pot(), 0);
    }

    function test_finalBlow_getsSniperShare() public {
        vm.prank(owner);
        game.startRaid(100);

        vm.prank(alice);
        game.mintLicense();
        vm.prank(bob);
        game.mintLicense();

        vm.prank(owner);
        game.injectBounty(1_000_000 ether);

        // Knock boss down to near-zero with alice, then bob lands the final blow.
        uint256 safety;
        while (game.bossHP() > 100 && safety < 500) {
            vm.roll(block.number + 1);
            vm.prank(alice);
            game.attack();
            safety++;
        }
        // Bob lands the killing hit
        uint256 bobBefore = clawd.balanceOf(bob);
        vm.roll(block.number + 1);
        vm.prank(bob);
        game.attack();
        uint256 bobGain = clawd.balanceOf(bob) - bobBefore;

        assertEq(game.finalBlowWallet(), bob);
        // Bob gets at minimum reload + heavy + sniper for his damage; should be a chunky payout.
        assertGt(bobGain, 0);
        assertFalse(game.raidActive());
    }

    function test_raidResetBetweenRaids() public {
        // Raid 1
        vm.prank(owner);
        game.startRaid(200);
        vm.prank(alice);
        game.mintLicense();
        vm.prank(owner);
        game.injectBounty(10_000 ether);

        uint256 safety;
        while (game.raidActive() && safety < 100) {
            vm.roll(block.number + 1);
            vm.prank(alice);
            game.attack();
            safety++;
        }

        (uint256 aliceDmg1,) = game.getDamage(alice);
        assertGt(aliceDmg1, 0);

        // Raid 2 — per-raid state cleared
        vm.prank(owner);
        game.startRaid(500);
        assertEq(game.raidId(), 2);
        (uint256 aliceDmg2, uint256 aliceCount2) = game.getDamage(alice);
        assertEq(aliceDmg2, 0);
        assertEq(aliceCount2, 0);
        assertEq(game.attackersLength(), 0);
        assertEq(game.finalBlowWallet(), address(0));
    }

    // --- Bounty ---
    function test_injectBounty_onlyOwner() public {
        vm.prank(owner);
        game.startRaid(1_000);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        game.injectBounty(100 ether);
    }

    function test_injectBounty_requiresActiveRaid() public {
        vm.prank(owner);
        vm.expectRevert(BossSlayer.RaidNotActive.selector);
        game.injectBounty(100 ether);
    }

    function test_injectBounty_addsToPot() public {
        vm.prank(owner);
        game.startRaid(1_000);
        vm.prank(owner);
        game.injectBounty(500 ether);
        assertEq(game.pot(), 500 ether);
        assertEq(clawd.balanceOf(address(game)), 500 ether);
    }

    // --- Leaderboard ---
    function test_leaderboard_sortsByDamage() public {
        vm.prank(owner);
        game.startRaid(10_000_000); // huge HP so we can land many uncapped hits

        address[4] memory players = [alice, bob, carol, address(0xBEEF4)];
        uint256[4] memory attacks = [uint256(10), 5, 20, 1];

        for (uint256 i = 0; i < players.length; i++) {
            address p = players[i];
            if (p != alice && p != bob && p != carol) {
                clawd.mint(p, 1_000_000 ether);
                vm.prank(p);
                clawd.approve(address(game), type(uint256).max);
            }
            vm.prank(p);
            game.mintLicense();
            for (uint256 j = 0; j < attacks[i]; j++) {
                vm.roll(block.number + 1);
                vm.prank(p);
                game.attack();
            }
        }

        (address[] memory top, uint256[] memory dmgs) = game.getLeaderboard(10);
        assertEq(top.length, 4);
        // Top rank must have the most damage.
        assertEq(top[0], carol);
        // Damage strictly non-increasing.
        for (uint256 i = 1; i < dmgs.length; i++) {
            assertGe(dmgs[i - 1], dmgs[i]);
        }
    }

    // --- View ---
    function test_getRaidInfo() public {
        vm.prank(owner);
        game.startRaid(1_234);
        (
            uint256 rid,
            uint256 hp,
            uint256 maxHp,
            uint256 potV,
            uint256 attackerCount,
            bool active
        ) = game.getRaidInfo();
        assertEq(rid, 1);
        assertEq(hp, 1_234);
        assertEq(maxHp, 1_234);
        assertEq(potV, 0);
        assertEq(attackerCount, 0);
        assertTrue(active);
    }
}
