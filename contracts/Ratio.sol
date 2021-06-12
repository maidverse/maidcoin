// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRatio.sol";

contract Ratio is Ownable, IRatio {
    
    uint private _lpTokenToMaidPower = 1;
    uint private _lpTokenToNursePower = 1;
    uint private _corpRewardToNurseReward = 10;
    
    function precision() override external pure returns (uint) { return 1e18; }
    
    function lpTokenToMaidPower() override external view returns (uint) { return _lpTokenToMaidPower; }
    function lpTokenToNursePower() override external view returns (uint) { return _lpTokenToNursePower; }
    function corpRewardToNurseReward() override external view returns (uint) { return _corpRewardToNurseReward; }
    
    function changeLPTokenToMaidPower(uint value) onlyOwner external {
        _lpTokenToMaidPower = value;
        emit ChangeLPTokenToMaidPower(value);
    }
    
    function changeLPTokenToNursePower(uint value) onlyOwner external {
        _lpTokenToNursePower = value;
        emit ChangeLPTokenToNursePower(value);
    }
    
    function changeCorpRewardToNurseReward(uint value) onlyOwner external {
        _corpRewardToNurseReward = value;
        emit ChangeCorpRewardToNurseReward(value);
    }
}
