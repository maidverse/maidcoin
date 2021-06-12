// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMaidCoin.sol";

contract MaidCoin is Ownable, ERC20("MaidCoin", "$MAID"), IMaidCoin {
    
	uint constant public INITIAL_SUPPLY = 30000 * 1e18;
    
	address override public masters = _msgSender();
	address override public maidCorp = _msgSender();
	address override public cloneNurse = _msgSender();
	address override public maid = _msgSender();
	address override public nurseRaid = _msgSender();
	
	function initialSupply() override external pure returns (uint) { return INITIAL_SUPPLY; }
    
    function changeMasters(address addr) onlyOwner external { masters = addr; }
    function changeMaidCorp(address addr) onlyOwner external { maidCorp = addr; }
    function changeCloneNurse(address addr) onlyOwner external { cloneNurse = addr; }
    function changeMaid(address addr) onlyOwner external { maid = addr; }
    function changeNurseRaid(address addr) onlyOwner external { nurseRaid = addr; }
    
    constructor() {
		_mint(_msgSender(), INITIAL_SUPPLY);
	}
	
	function allowance(address user, address spender) override(ERC20, IERC20) public view returns (uint) {
		if (spender == maid || spender == nurseRaid) {
			return balanceOf(user);
		}
		return super.allowance(user, spender);
	}

	function transferFrom(address from, address to, uint256 amount) override(ERC20, IERC20) public returns (bool) {
		uint256 _allowance = super.allowance(from, msg.sender);
		if (_allowance != type(uint256).max && msg.sender != maid && msg.sender != nurseRaid) {
			_approve(from, _msgSender(), _allowance - amount);
		}
		_transfer(from, to, amount);
		return true;
	}

	function mint(address to, uint amount) override external {
		require(msg.sender == maidCorp || msg.sender == cloneNurse);

        uint mastersAmount = amount / 10; // 10% to masters.
        uint toAmount = amount - mastersAmount;
        
		_mint(masters, mastersAmount);
		_mint(to, toAmount);
		
        emit Mint(to, toAmount);
	}

    function burn(address from, uint amount) override external {
		require(msg.sender == maid || msg.sender == nurseRaid);
        _burn(from, amount);
        emit Burn(from, amount);
    }
}
