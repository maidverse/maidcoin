// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

interface IRNG {
    function generateRandomNumber(uint256 seed) external returns (uint256);
}
