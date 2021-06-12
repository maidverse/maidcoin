// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMaidCorp.sol";
import "./interfaces/IRatio.sol";
import "./interfaces/IMaidCoin.sol";

contract MaidCorp is Ownable, IMaidCorp {
    
	IRatio override public ratio;
	IMaidCoin override public maidCoin;
	IERC20 override public lpToken;
	
	uint private lastUpdateBlock;
    uint private _accRewardPerShare;
	uint private totalLPTokenAmount = 0;
	
	mapping(address => uint) private lpTokenAmounts;
	mapping(address => uint) private accRewards;
	
    constructor(address ratioAddr, address maidCoinAddr, address lpTokenAddr) {
		ratio = IRatio(ratioAddr);
		maidCoin = IMaidCoin(maidCoinAddr);
		lpToken = IERC20(lpTokenAddr);
	}
	
    function changeLPToken(address addr) onlyOwner external { lpToken = IERC20(addr); }
    
    function deposit(uint lpTokenAmount) override external {
        claim();
        lpTokenAmounts[msg.sender] += lpTokenAmount;
        totalLPTokenAmount += lpTokenAmount;
        
        emit Deposit(msg.sender, lpTokenAmount);
    }
    
    function withdraw(uint lpTokenAmount) override external {
        claim();
        lpTokenAmounts[msg.sender] -= lpTokenAmount;
        totalLPTokenAmount -= lpTokenAmount;
        
        emit Withdraw(msg.sender, lpTokenAmount);
    }
    
    function accRewardPerShare() internal view returns (uint result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result += maidCoin.maidCorpAccReward() * 1e18 / totalLPTokenAmount;
        }
    }
    
    function _update() internal returns (uint result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result += maidCoin.mintForMaidCorp() * 1e18 / totalLPTokenAmount;
            _accRewardPerShare = result;
            lastUpdateBlock = block.number;
        }
    }
    
    function claimAmount() override public view returns (uint) {
        return accRewardPerShare() * lpTokenAmounts[msg.sender] / 1e18 - accRewards[msg.sender];
    }
    
    function claim() override public {
        uint reward = _update() * lpTokenAmounts[msg.sender] / 1e18 - accRewards[msg.sender];
        maidCoin.transfer(msg.sender, reward);
        accRewards[msg.sender] += reward;
    }
}
