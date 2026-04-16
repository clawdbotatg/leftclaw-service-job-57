// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";
import { BossSlayer } from "../contracts/BossSlayer.sol";
import { Clawd } from "../contracts/Clawd.sol";


/// @notice Deploys BossSlayer. On Base (8453) it wires to the real CLAWD token; on anvil (31337)
/// it deploys a Clawd and pre-funds the deployer so the frontend demo works out of the box.
contract DeployScript is ScaffoldETHDeploy {
    // Real CLAWD on Base. Addresses are never secrets — safe to hardcode here for the prod wiring.
    address internal constant CLAWD_BASE = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;

    // Client wallet — gets owner role on the deployed game contract. Public address, not a secret.
    address internal constant OWNER = 0x7E6Db18aea6b54109f4E5F34242d4A8786E0C471;

    function run() external ScaffoldEthDeployerRunner {
        address clawd;
        if (block.chainid == 8453) {
            clawd = CLAWD_BASE;
        } else {
            Clawd mock = new Clawd();
            // Export the mock under the same name as the real token so the UI's contractName is stable.
            deployments.push(Deployment("Clawd", address(mock)));
            // Seed the deployer with plenty of mock CLAWD so they can poke the dApp locally.
            mock.mint(deployer, 10_000_000 ether);
            clawd = address(mock);
        }

        BossSlayer game = new BossSlayer(clawd, OWNER);
        deployments.push(Deployment("BossSlayer", address(game)));
    }
}
