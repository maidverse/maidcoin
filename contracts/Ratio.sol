// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRatio.sol";

contract Ratio is Ownable, IRatio {
    uint256 public override lpTokenToMaidPower = 1;
    uint256 public override maidPowerToRaidReducedBlock = 1;
    uint256 public override lpTokenToNursePower = 1;
    uint256 public override nursePowerToRewardAmount = 1;
    uint256 public override corpRewardToNurseReward = 10;

    function precision() external pure override returns (uint256) {
        return 1e18;
    }

    function changeLPTokenToMaidPower(uint256 value) external onlyOwner {
        lpTokenToMaidPower = value;
        emit ChangeLPTokenToMaidPower(value);
    }

    function changeMaidPowerToRaidReducedBlock(uint256 value)
        external
        onlyOwner
    {
        maidPowerToRaidReducedBlock = value;
        emit ChangeMaidPowerToRaidReducedBlock(value);
    }

    function changeLPTokenToNursePower(uint256 value) external onlyOwner {
        lpTokenToNursePower = value;
        emit ChangeLPTokenToNursePower(value);
    }

    function changeNursePowerToRewardAmount(uint256 value) external onlyOwner {
        nursePowerToRewardAmount = value;
        emit ChangeNursePowerToRewardAmount(value);
    }

    function changeCorpRewardToNurseReward(uint256 value) external onlyOwner {
        corpRewardToNurseReward = value;
        emit ChangeCorpRewardToNurseReward(value);
    }
}
