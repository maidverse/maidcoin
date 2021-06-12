// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRatio.sol";

contract Ratio is Ownable, IRatio {
    
    uint override public lpTokenToMaidPower = 1;
    uint override public maidPowerToRaidReducedBlock = 1;
    uint override public lpTokenToNursePower = 1;
    uint override public nursePowerToRewardAmount = 1;
    uint override public corpRewardToNurseReward = 10;
    
    function precision() override external pure returns (uint) { return 1e18; }
    
    function changeLPTokenToMaidPower(uint value) onlyOwner external {
        lpTokenToMaidPower = value;
        emit ChangeLPTokenToMaidPower(value);
    }
    
    function changeMaidPowerToRaidReducedBlock(uint value) onlyOwner external {
        maidPowerToRaidReducedBlock = value;
        emit ChangeMaidPowerToRaidReducedBlock(value);
    }
    
    function changeLPTokenToNursePower(uint value) onlyOwner external {
        lpTokenToNursePower = value;
        emit ChangeLPTokenToNursePower(value);
    }
    
    function changeNursePowerToRewardAmount(uint value) onlyOwner external {
        nursePowerToRewardAmount = value;
        emit ChangeNursePowerToRewardAmount(value);
    }
    
    function changeCorpRewardToNurseReward(uint value) onlyOwner external {
        corpRewardToNurseReward = value;
        emit ChangeCorpRewardToNurseReward(value);
    }
}
