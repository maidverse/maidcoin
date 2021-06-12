// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INurseRaid.sol";
import "./interfaces/IRatio.sol";
import "./interfaces/IMaid.sol";
import "./interfaces/IMaidCoin.sol";
import "./interfaces/INursePart.sol";
import "./interfaces/IRNG.sol";

contract NurseRaid is Ownable, INurseRaid {
    
	uint constant public MAX_MAIDS_PER_RAID = 5;
    
	IRatio override public ratio;
	IMaid override public maid;
	IMaidCoin override public maidCoin;
	INursePart override public nursePart;
	IRNG override public rng;
	
    constructor(address ratioAddr, address maidAddr, address maidCoinAddr, address nursePartAddr, address rngAddr) {
		ratio = IRatio(ratioAddr);
		maid = IMaid(maidAddr);
		maidCoin = IMaidCoin(maidCoinAddr);
		nursePart = INursePart(nursePartAddr);
		rng = IRNG(rngAddr);
	}
	
    function changeRNG(address addr) onlyOwner external { rng = IRNG(addr); }
	
    struct Raid {
		uint entranceFee;
		uint nursePart;
		uint maxRewardCount;
		uint duration;
		uint endBlock;
	}
	Raid[] public raids;
	
	struct Challenger {
		uint enterBlock;
		uint[] maids;
	}
    mapping(uint => mapping(address => Challenger)) public challengers;
    
    function create(uint entranceFee, uint _nursePart, uint maxRewardCount, uint duration, uint endBlock) onlyOwner override external returns (uint id) {
        id = raids.length;
        raids.push(Raid({
			entranceFee: entranceFee,
			nursePart: _nursePart,
			maxRewardCount: maxRewardCount,
			duration: duration,
			endBlock: endBlock
		}));
		emit Create(id, entranceFee, _nursePart, maxRewardCount, duration, endBlock);
    }
    
    function enter(uint id, uint[] calldata maids) override external {
        
		Raid memory raid = raids[id];
		require(block.number < raid.endBlock);
		require(maids.length < MAX_MAIDS_PER_RAID);
		
        require(challengers[id][msg.sender].enterBlock == 0);
        challengers[id][msg.sender] = Challenger({
            enterBlock: block.number,
            maids: maids
        });
        
		uint maidsLength = maids.length;
		for (uint i = 0; i < maidsLength; i += 1) {
			maid.transferFrom(msg.sender, address(this), maids[i]);
		}
        
		maidCoin.burn(msg.sender, raid.entranceFee);
		emit Enter(msg.sender, id, maids);
    }
    
    function checkDone(uint id) override public view returns (bool) {
        
		Raid memory raid = raids[id];
        Challenger memory challenger = challengers[id][msg.sender];
        
		uint maidsLength = challenger.maids.length;
		uint totalPower = 0;
		for (uint i = 0; i < maidsLength; i += 1) {
			totalPower += maid.powerOf(challenger.maids[i]);
		}
		
		return block.number - challenger.enterBlock + totalPower * ratio.maidPowerToRaidReducedBlock() >= raid.duration;
    }
    
    function exit(uint id) override external {
        
        Challenger memory challenger = challengers[id][msg.sender];
        require(challenger.enterBlock != 0);
        
		Raid memory raid = raids[id];

		// done
		if (checkDone(id) == true) {
			uint rewardCount = rng.generateRandomNumber(id) % raid.maxRewardCount + 1;
			nursePart.mint(msg.sender, raid.nursePart, rewardCount);
		}
        
		uint maidsLength = challenger.maids.length;
		for (uint i = 0; i < maidsLength; i += 1) {
			maid.transferFrom(address(this), msg.sender, challenger.maids[i]);
		}
        
        delete challengers[id][msg.sender];
        
		emit Exit(msg.sender, id);
    }
}
