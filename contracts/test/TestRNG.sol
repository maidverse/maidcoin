// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "../interfaces/IRNG.sol";

contract TestRNG is IRNG {
    function generateRandomNumber(uint256 seed, address sender) external override returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp)));
    }
}
