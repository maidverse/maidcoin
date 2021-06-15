// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

interface IRewardCalculator {
    function rewardPerBlock() external view returns (uint256);
}
