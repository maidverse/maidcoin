// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidCoinInterface.sol";

contract MaidCoin is MaidCoinInterface {

	string constant private NAME = "MaidCoin";
	string constant private SYMBOL = "MAID";
	uint8 constant private DECIMALS = 18;
	uint256 constant private INITIAL_SUPPLY = 30000 * (10 ** uint(DECIMALS));
	
	uint256 private _totalSupply;
	mapping(address => uint256) private balances;
	mapping(address => mapping(address => uint256)) private allowed;
	mapping(address => mapping(uint256 => uint256[])) private burned;
	mapping(address => mapping(uint256 => mapping(uint256 => bool))) private minted;

	address public override masters;
	address public override maidCorp;
	address public override cloneNurses;
	address public override maids;
	address public override nurseRaids;
	
	constructor() {
		masters = msg.sender;
		balances[msg.sender] = INITIAL_SUPPLY;
		_totalSupply = INITIAL_SUPPLY;
	}

	function changeMasters(address newMasters) external {
		require(msg.sender == masters);
		masters = newMasters;
	}

	function changeMaidCorp(address newMaidCorp) external {
		require(msg.sender == masters);
		maidCorp = newMaidCorp;
	}

	function changeCloneNurses(address newCloneNurses) external {
		require(msg.sender == masters);
		cloneNurses = newCloneNurses;
	}

	function changeMaids(address newMaids) external {
		require(msg.sender == masters);
		maids = newMaids;
	}

	function changeCloneNurse(address newNurseRaids) external {
		require(msg.sender == masters);
		nurseRaids = newNurseRaids;
	}

	function name() external pure override returns (string memory) { return NAME; }
	function symbol() external pure override returns (string memory) { return SYMBOL; }
	function decimals() external pure override returns (uint8) { return DECIMALS; }
	function totalSupply() external view override returns (uint256) { return _totalSupply; }
	function initialSupply() external view override returns (uint256) { return INITIAL_SUPPLY; }

	function balanceOf(address user) external view override returns (uint256 balance) {
		return balances[user];
	}

	function transfer(address to, uint256 amount) public override returns (bool success) {
		balances[msg.sender] -= amount;
		balances[to] += amount;
		emit Transfer(msg.sender, to, amount);
		return true;
	}

	function approve(address spender, uint256 amount) external override returns (bool success) {
		allowed[msg.sender][spender] = amount;
		emit Approval(msg.sender, spender, amount);
		return true;
	}

	function allowance(address user, address spender) external view override returns (uint256 remaining) {
		if (spender == maids || spender == nurseRaids) {
			return balances[user];
		}
		return allowed[user][spender];
	}

	function transferFrom(address from, address to, uint256 amount) external override returns (bool success) {
		uint256 _allowance = allowed[from][msg.sender];
		if (_allowance != type(uint256).max && msg.sender != maids && msg.sender != nurseRaids) {
			allowed[from][msg.sender] = _allowance - amount;
		}
		balances[from] -= amount;
		balances[to] += amount;
		emit Transfer(from, to, amount);
		return true;
	}

	function mint(address to, uint256 amount) external override {
		require(msg.sender == maidCorp || msg.sender == cloneNurses);

        uint256 mastersAmount = amount / 10; // 10% to masters.
        uint256 toAmount = amount - mastersAmount;

		balances[to] += toAmount;
		emit Transfer(address(0), to, toAmount);

		balances[masters] += mastersAmount;
		emit Transfer(address(0), masters, mastersAmount);

		_totalSupply += amount;
	}
}
