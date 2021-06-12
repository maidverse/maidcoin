// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMasterCoin.sol";
import "./interfaces/IMaidCoin.sol";

contract MasterCoin is ERC20("MasterCoin", "$MASTER"), IMasterCoin {
    
	uint constant public INITIAL_SUPPLY = 100 * 1e18;
    
	IMaidCoin override public maidCoin;
	
	uint private lastRewardAddedBlock;
    uint private accRewardPerShare;
	
	mapping(address => uint) private accRewards;
    
    constructor(address maidCoinAddr) {
		_mint(_msgSender(), INITIAL_SUPPLY);
		maidCoin = IMaidCoin(maidCoinAddr);
	}
	
	function addReward(uint reward) override public {
	    if (lastRewardAddedBlock != block.number) {
            accRewardPerShare += reward / 100;
            lastRewardAddedBlock = block.number;
	    }
	}

	function transfer(address to, uint256 amount) override(ERC20, IERC20) public returns (bool) {
		claim(_msgSender());
		return super.transfer(to, amount);
	}

	function transferFrom(address from, address to, uint256 amount) override(ERC20, IERC20) public returns (bool) {
		claim(from);
		return super.transferFrom(from, to, amount);
	}
    
    function claimAmount(address master) override public view returns (uint) {
        return accRewardPerShare * balanceOf(master) / 1e18 - accRewards[master];
    }

    function claim(address master) override public {
        uint reward = claimAmount(master);
        maidCoin.transfer(master, reward);
        accRewards[master] += reward;
    }
}
