// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

interface IRatio {
    event ChangeLPTokenToMaidPower(uint256 value);
    event ChangeMaidPowerToRaidReducedBlock(uint256 value);
    event ChangeLPTokenToNursePower(uint256 value);
    event ChangeNursePowerToRewardAmount(uint256 value);
    event ChangeCorpRewardToNurseReward(uint256 value);

    function precision() external view returns (uint256);

    function lpTokenToMaidPower() external view returns (uint256);

    function maidPowerToRaidReducedBlock() external view returns (uint256);

    function lpTokenToNursePower() external view returns (uint256);

    function nursePowerToRewardAmount() external view returns (uint256);

    function corpRewardToNurseReward() external view returns (uint256);
}
