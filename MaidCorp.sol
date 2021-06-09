// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidCorpInterface.sol";

contract MaidCorp is MaidCorpInterface {
	
    uint8   constant public DECIMALS = 8;
    uint256 constant public COIN = 10 ** uint256(DECIMALS);
    uint256 constant public COIN_PER_BLOCK = 10;
	uint256 constant public HALVING_INTERVAL = 210000 * 20;

	address public override masters;
	address public override maidCoin;
	address public override lpToken;
	
    uint256 immutable public startBlock;
    
	constructor() {
		masters = msg.sender;
		startBlock = block.number;
	}

	function changeMasters(address newMasters) external {
		require(msg.sender == masters);
		masters = newMasters;
	}
    
	function changeMaidCoin(address newMaidCoin) external {
		require(msg.sender == masters);
		maidCoin = newMaidCoin;
	}
    
	function changeLPToken(address newLPToken) external {
		require(msg.sender == masters);
		lpToken = newLPToken;
	}
    
    function deposit(uint256 lpTokenAmount) external override {
        //TODO:
    }

    function withdraw(uint256 lpTokenAmount) external override {
        //TODO:
    }
    	
    function accCoinAt(uint256 blockNumber) internal view returns (uint256) {
		//TODO:
	}
    
    function claimCoinAmount() external override view returns (uint256 coinAmount) {
        //TODO:
    }

    function claim(uint256 id) external override {
        //TODO:
    }
}
