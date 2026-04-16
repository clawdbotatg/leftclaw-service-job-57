// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Local-only stand-in for the CLAWD ERC-20 token. Used for anvil deploys and foundry tests.
/// @dev NOT deployed to Base. On Base we use the real CLAWD at 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07.
/// Same contract name as the Base token so auto-generated ABIs line up with externalContracts.
contract Clawd is ERC20 {
    constructor() ERC20("CLAWD (mock)", "CLAWD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
