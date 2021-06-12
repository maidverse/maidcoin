// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/ICloneNurse.sol";
import "./interfaces/INursePart.sol";

contract CloneNurse is Ownable, ERC721("CloneNurse", "CNURSE"), ICloneNurse {
    
	IRatio override public ratio;
	INursePart override public nursePart;
	IMaidCoin override public maidCoin;
	IERC20 override public lpToken;
	
    constructor(address ratioAddr, address nursePartAddr, address maidCoinAddr, address lpTokenAddr) {
		ratio = IRatio(ratioAddr);
		nursePart = INursePart(nursePartAddr);
		maidCoin = IMaidCoin(maidCoinAddr);
		lpToken = IERC20(lpTokenAddr);
	}
	
    function changeLPToken(address addr) onlyOwner external { lpToken = IERC20(addr); }
    
    struct NurseType {
		uint partCount;
		uint destroyReturn;
		uint power;
	}
	NurseType[] public nurseTypes;
    
    function addNurseClass(uint partCount, uint destroyReturn, uint power) onlyOwner external returns (uint nurseType) {
        nurseType = nurseTypes.length;
		nurseTypes.push(NurseType({
			partCount: partCount,
			destroyReturn: destroyReturn,
			power: power
		}));
    }
    
    function originPower(uint nurseType) internal view returns (uint) {
        return nurseTypes[nurseType].power;
    }
    
    
	uint private lastUpdateBlock;
    uint private _accRewardPerShare;
	uint private totalPower = 0;

	struct Nurse {
	    address master;
		
		uint nurseType;
		uint supportPower;
		
		uint masterAccReward;
		uint supporterAccReward;

		bool supportable;
	}
	Nurse[] public nurses;

	struct Supporter {
		address addr;
		uint lpTokenAmount;
		uint accReward;
	}
    mapping(uint => Supporter[]) public supporters;
    mapping(uint => mapping(address => uint)) public addrToSupporter;
    
    function assemble(uint ntype, bool supportable) override external returns (uint id) {
        
		NurseType memory nurseType = nurseTypes[ntype];
        
        nursePart.burn(msg.sender, ntype, nurseType.partCount);
        
        uint power = originPower(ntype);
		
        id = nurses.length;
        
		nurses.push(Nurse({
		    master: msg.sender,
		    
		    nurseType: ntype,
		    supportPower: 0,
		    
		    masterAccReward: _update() * power / 1e18,
		    supporterAccReward: 0,
		    
		    supportable: supportable
		}));
		
		totalPower += power;
		
		_mint(address(this), id);
    }
    
    function changeSupportable(uint id, bool supportable) override external {
		require(msg.sender == ownerOf(id));
		nurses[id].supportable = supportable;
    }
    
    function moveSupporters(uint from, uint to, uint number) override external {
        //TODO:
    }
    
    function destroy(uint id, uint symbolTo) override external {
        //TODO:
    }
    
    function support(uint id, uint lpTokenAmount) override external {
        //TODO:
    }
    
    function desupport(uint id, uint lpTokenAmount) override external {
        //TODO:
    }
    
    function accRewardPerShare() internal view returns (uint result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result += maidCoin.nurseRaidAccReward() * 1e18 / totalPower;
        }
    }
    
    function _update() internal returns (uint result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result += maidCoin.mintForCloneNurse() * 1e18 / totalPower;
            _accRewardPerShare = result;
            lastUpdateBlock = block.number;
        }
    }
    
    function claimAmountOf(uint id) override external view returns (uint) {
        
        Nurse memory nurse = nurses[id];
        if (nurse.master == address(0)) {
            return 0;
        }
        
        uint _originPower = originPower(nurse.nurseType);
		uint power = _originPower + nurse.supportPower;
        uint acc = accRewardPerShare() * power / 1e18;
        uint totalReward = 0;
        
        // owner
		if (nurse.master == msg.sender) {
			totalReward += acc * _originPower / power - nurse.masterAccReward;
		}

		// supporter
		uint supporterId = addrToSupporter[id][msg.sender];
		if (supporterId != 0) {
			uint supporterAccReward = acc * nurse.supportPower / power - nurse.supporterAccReward;
			Supporter memory supporter = supporters[id][supporterId];
			totalReward += supporterAccReward * supporter.lpTokenAmount * ratio.lpTokenToNursePower() / ratio.precision() / nurse.supportPower - supporter.accReward;
		}

		return totalReward;
    }
    
    function claim(uint id) override external {
        
        Nurse storage nurse = nurses[id];
        require(nurse.master != address(0));
        
        uint _originPower = originPower(nurse.nurseType);
		uint power = _originPower + nurse.supportPower;
        uint acc = _update() * power / 1e18;
        uint totalReward = 0;
        
        // owner
		if (nurse.master == msg.sender) {
			uint reward = acc * _originPower / power - nurse.masterAccReward;
			totalReward += reward;
			nurse.masterAccReward += reward;
		}

		// supporter
		uint supporterId = addrToSupporter[id][msg.sender];
		if (supporterId != 0) {
			uint supporterAccReward = acc * nurse.supportPower / power - nurse.supporterAccReward;
			nurse.supporterAccReward += supporterAccReward;
			
			Supporter storage supporter = supporters[id][supporterId];
			uint reward = supporterAccReward * supporter.lpTokenAmount * ratio.lpTokenToNursePower() / ratio.precision() / nurse.supportPower - supporter.accReward;
			totalReward += reward;
			supporter.accReward += reward;
		}
		
		maidCoin.transfer(msg.sender, totalReward);
    }
}
