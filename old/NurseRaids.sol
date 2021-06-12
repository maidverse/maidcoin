// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NurseRaidsInterface.sol";
import "./MaidsInterface.sol";
import "./NursePartsInterface.sol";
import "./RNGInterface.sol";

contract NurseRaids is NurseRaidsInterface {
    
	address public override masters;
	address public override maidCoin;
	MaidsInterface public override maids;
	NursePartsInterface public override nurseParts;
	RNGInterface private override rng;

	struct Raid {
		uint256 entranceFee;
		uint256 nurseType;
		uint256 maxRewardCount;
		uint256 duration;
		uint256 endBlock;
	}
	Raid[] public raids;
	
	struct Challenger {
		address addr;
		uint256[] maids;
		uint256 enterBlock;
	}
    mapping(uint256 => Challenger[]) public challengers;
    mapping(uint256 => mapping(address => uint256)) public addrToChallenger;

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

	function changeMaids(address maidsAddress) external {
		require(msg.sender == masters);
		maids = MaidsInterface(maidsAddress);
	}

	function changeNurseParts(address nursePartsAddress) external {
		require(msg.sender == masters);
		nurseParts = NursePartsInterface(nursePartsAddress);
	}

	function changeRNG(address rngAddress) external {
		require(msg.sender == masters);
		rng = RNGInterface(rngAddress);
	}

    function createRaid(uint256 entranceFee, uint256 nurseType, uint256 maxRewardCount, uint256 duration, uint256 endBlock) external override returns (uint256) {
		require(msg.sender == masters);
		
		uint256 id = raids.length;
		raids.push(Raid({
			entranceFee: entranceFee,
			nurseType: nurseType,
			maxRewardCount: maxRewardCount,
			duration: duration,
			endBlock: endBlock
		}));

		challengers[id].push({
			addr: address(0),
			maids: new uint256[],
			enterBlock: 0
		});

		emit CreateRaid(id, entranceFee, nurseType, duration, endBlock);
		return id;
    }
    
    function enter(uint256 id, uint256[] calldata maidIds) external returns (uint256) {
		
		Raid memory raid = raids[id];
		require(block.number < raid.endBlock);
       
		uint256 challengerId = addrToChallenger[id][msg.sender];
		require(challengerId == 0);

		Challenger[] storage chals = challengers[id];
		challengerId = chals.length;

		chals.push(Challenger({
			addr: msg.sender,
			maids: maidIds,
			enterBlock: block.number
		}));

		addrToChallenger[id][msg.sender] = challengerId;

		maidCoin.burn(msg.sender, raid.entranceFee);

		emit Enter(msg.sender, id, maidIds);

		return challengerId;
    }

	function _checkDone(Raid memory raid, Challenger memory challenger) internal returns (bool) {
		uint256 totalPower = madis.totalPowerOf(msg.sender);
		return block.number - challenger.enterBlock + totalPower >= raid.duration;
	}

	function checkDone(uint256 id) external returns (bool) {
		uint256 challengerId = addrToChallenger[id][msg.sender];
		require(challengerId != 0);
		return _checkDone(raids[id], challengers[id][challengerId]);
	}

    function exit(uint256 id) external {
		
		uint256 challengerId = addrToChallenger[id][msg.sender];
		require(challengerId != 0);

		Raid memory raid = raids[id];
		Challenger memory challenger = challengers[id][challengerId];

		// done
		if (_checkDone(raid, challenger) == true) {
			uint256 rewardCount = rng.generateRandomNumber(id) % raid.maxRewardCount + 1;
			nurseParts.mint(msg.sender, raid.nurseType, rewardCount);
		}
		
		delete challengers[id][challengerId];
		addrToChallenger[id][msg.sender] = 0;
    }
}
