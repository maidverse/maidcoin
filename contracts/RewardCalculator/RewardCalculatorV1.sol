// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "../interfaces/IRewardCalculator.sol";

contract RewardCalculator is IRewardCalculator {
    uint256 public constant startBlock = 13316000;
    uint256 public constant initialRewardPerBlock = 1e18;
    uint256 public constant decreasingInterval = 86400;

    function rewardPerBlock() external view override returns (uint256) {
        uint256 era = (block.number - startBlock) / decreasingInterval;
        return initialRewardPerBlock / (era + 1);
    }
}