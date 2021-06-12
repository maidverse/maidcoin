// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMasterCoin.sol";
import "./interfaces/IMaidCoin.sol";

contract MasterCoin is ERC20("MasterCoin", "MASTER"), IMasterCoin {
    
	uint constant public INITIAL_SUPPLY = 100 * 1e18;
    
	IMaidCoin override public maidCoin;
	
	uint private lastRewardBlock;
    uint private accRewardPerShare;
	uint private accRewarded;
	
	mapping(address => uint) private accRewards;
    
    constructor(address maidCoinAddr) {
		_mint(_msgSender(), INITIAL_SUPPLY);
		maidCoin = IMaidCoin(maidCoinAddr);
	}
	
	function _calculateAccRewardPerShare() internal view returns (uint) {
	    return (maidCoin.balanceOf(address(this)) - maidCoin.initialSupply() + accRewarded) / 100;
	}
	
	function _update() internal returns (uint _accRewardPerShare) {
	    if (lastRewardBlock != block.number) {
	        _accRewardPerShare = _calculateAccRewardPerShare();
            accRewardPerShare = _accRewardPerShare;
            lastRewardBlock = block.number;
	    } else {
            _accRewardPerShare = accRewardPerShare;
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
    
    function claimAmount(address master) override external view returns (uint) {
        return _calculateAccRewardPerShare() * balanceOf(master) / 1e18 - accRewards[master];
    }

    function claim(address master) override public {
        uint _accRewardPerShare = _update();
        uint reward = _accRewardPerShare * balanceOf(master) / 1e18 - accRewards[master];
        maidCoin.transfer(master, reward);
        accRewards[master] += reward;
    }
}
