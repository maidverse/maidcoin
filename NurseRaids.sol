// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NurseRaidsInterface.sol";

contract NurseRaids is NurseRaidsInterface {
    
	address public override masters;
	address public override maidCoin;
	address public override maids;

	struct Raid {
		uint256 entranceFee;
		uint256 nurseType;
		uint256 endBlock;
	}
	Raid[] public raids;

	constructor() {
		masters = msg.sender;
	}

	function changeMasters(address newMasters) external {
		require(msg.sender == masters);
		masters = newMasters;
	}
    
	function changeMaidCoin(address newMaidCoin) external {
		require(msg.sender == masters);
		maidCoin = newMaidCoin;
	}

	function changeMaids(address newMaids) external {
		require(msg.sender == masters);
		maids = newMaids;
	}

    function createRaid(uint256 entranceFee, uint256 nurseType, uint256 endBlock) external override returns (uint256) {
		require(msg.sender == masters);
		uint256 raidId = raids.length;
		raids.push(Raid({
			entranceFee: entranceFee,
			nurseType: nurseType,
			endBlock: endBlock
		}));
		return raidId;
    }
    
    function removeRaid(uint256 raidId) external {
        //TODO:
    }
    
    function enter(uint256 raidId, uint256[] calldata maidIds) external {
        //TODO:
    }

    function exit(uint256 raidId) external {
        //TODO:
    }
}
