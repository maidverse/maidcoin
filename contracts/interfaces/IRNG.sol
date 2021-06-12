// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

interface IRNG {
    function generateRandomNumber(uint seed) external returns (uint);
}
