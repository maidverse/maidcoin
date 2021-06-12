// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMaidCoin.sol";

contract MaidCoin is Ownable, ERC20("MaidCoin", "$MAID"), IMaidCoin {
    
	uint constant public INITIAL_SUPPLY = 30000 * 1e18;
	uint constant public REWARD_PER_BLOCK = 100 * 1e18;
	uint constant public HALVING_INTERVAL = 4000000;
    
	IRatio override public ratio;
	IMasterCoin override public masterCoin;
	
	address override public maidCorp = _msgSender();
	address override public cloneNurse = _msgSender();
	address override public maid = _msgSender();
	address override public nurseRaid = _msgSender();
	
	uint private startBlock;
	uint private lastUpdateBlock;
    uint private _accRewardPerShare;
    
    uint private _maidCorpAccReward;
    uint private _nurseRaidAccReward;
	
	constructor(address ratioAddr) {
		ratio = IRatio(ratioAddr);
		startBlock = block.number;
		_mint(_msgSender(), INITIAL_SUPPLY);
	}
	
	function initialSupply() override external pure returns (uint) { return INITIAL_SUPPLY; }
    
    function changeMasterCoin(address addr) onlyOwner external { masterCoin = IMasterCoin(addr); }
    function changeMaidCorp(address addr) onlyOwner external { maidCorp = addr; }
    function changeCloneNurse(address addr) onlyOwner external { cloneNurse = addr; }
    function changeMaid(address addr) onlyOwner external { maid = addr; }
    function changeNurseRaid(address addr) onlyOwner external { nurseRaid = addr; }
	
	function allowance(address user, address spender) override(ERC20, IERC20) public view returns (uint) {
		if (spender == maid || spender == nurseRaid) {
			return balanceOf(user);
		}
		return super.allowance(user, spender);
	}

	function transferFrom(address from, address to, uint amount) override(ERC20, IERC20) public returns (bool) {
		uint _allowance = super.allowance(from, msg.sender);
		if (_allowance != type(uint).max && msg.sender != maid && msg.sender != nurseRaid) {
			_approve(from, _msgSender(), _allowance - amount);
		}
		_transfer(from, to, amount);
		return true;
	}
	
	function _accRewardPerBlockAt(uint blockNumber) internal view returns (uint) {
        uint era = (blockNumber - startBlock) / HALVING_INTERVAL;
        return REWARD_PER_BLOCK / era;
    }
    
    function accRewardPerShare() internal view returns (uint result) {
        result = _accRewardPerShare;
        
        if (lastUpdateBlock != block.number) {
            
            uint _lastUpdateBlock = lastUpdateBlock;
            uint era1 = (_lastUpdateBlock - startBlock) / HALVING_INTERVAL;
            uint era2 = (block.number - startBlock) / HALVING_INTERVAL;
    
            if (era1 == era2) {
                result += (block.number - _lastUpdateBlock) * _accRewardPerBlockAt(block.number);
            } else {
                uint boundary = (era1 + 1) * HALVING_INTERVAL + startBlock;
                result += (boundary - _lastUpdateBlock) * _accRewardPerBlockAt(_lastUpdateBlock);
                uint span = era2 - era1;
                for (uint i = 1; i < span; i += 1) {
                    boundary = (era1 + 1 + i) * HALVING_INTERVAL + startBlock;
                    result += HALVING_INTERVAL * _accRewardPerBlockAt(_lastUpdateBlock + HALVING_INTERVAL * i);
                }
                result += (block.number - boundary) * _accRewardPerBlockAt(block.number);
            }
        }
    }
    
    function _update() internal returns (uint result) {
        result = accRewardPerShare();
        if (lastUpdateBlock != block.number) {
            _accRewardPerShare = result;
            lastUpdateBlock = block.number;
        }
    }
    
    function mint(address to, uint amount) internal returns (uint toAmount) {
        
        uint masterReward = amount / 10; // 10% to masters.
        toAmount = amount - masterReward;
        
        _mint(address(masterCoin), masterReward);
        masterCoin.addReward(masterReward);
        
        _mint(to, toAmount);
        
        emit Mint(to, toAmount);
    }
    
    function maidCorpAccReward() override external view returns (uint) {
        uint share = accRewardPerShare();
        uint reward = share * ratio.precision() /
            (ratio.precision() + ratio.corpRewardToNurseReward())
        - _maidCorpAccReward;
        return _maidCorpAccReward + reward - reward / 10; // 10% to masters.
    }
	
    function mintForMaidCorp() override external returns (uint) {
        require(msg.sender == maidCorp);
        uint share = _update();
        
        uint accReward = _maidCorpAccReward;
        uint reward = share * ratio.precision() /
            (ratio.precision() + ratio.corpRewardToNurseReward())
        - accReward;
        
        if (reward > 0) {
            accReward += mint(maidCorp, reward);
            _maidCorpAccReward = accReward;
        }
        
        return accReward;
    }
    
    function nurseRaidAccReward() override external view returns (uint) {
        uint share = accRewardPerShare();
        uint reward = share * ratio.precision() /
            (ratio.precision() + ratio.corpRewardToNurseReward())
                * ratio.corpRewardToNurseReward()
        - _nurseRaidAccReward;
        return _nurseRaidAccReward + reward - reward / 10; // 10% to masters.
    }
    
    function mintForCloneNurse() override external returns (uint) {
        require(msg.sender == nurseRaid);
        uint share = _update();
        
        uint accReward = _nurseRaidAccReward;
        uint reward = share * ratio.precision() /
            (ratio.precision() + ratio.corpRewardToNurseReward())
                * ratio.corpRewardToNurseReward()
        - accReward;
        
        if (reward > 0) {
            accReward += mint(nurseRaid, reward);
            _nurseRaidAccReward = accReward;
        }
        
        return accReward;
    }

    function burn(address from, uint amount) override external {
		require(msg.sender == maid || msg.sender == nurseRaid);
        _burn(from, amount);
        emit Burn(from, amount);
    }
}
