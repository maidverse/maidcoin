// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NurseRaidsInterface.sol";

contract NurseRaids is NurseRaidsInterface {
    
	address public override masters;
	address public override maidCoin;
	address public override maids;

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

    function createRaid(uint256 entranceFee, uint256 nurseType, uint256 duration) external {
        //TODO:
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
