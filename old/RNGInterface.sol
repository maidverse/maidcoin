// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface RNGInterface {
    function generateRandomNumber(uint256 seed) external returns (uint256);
}
