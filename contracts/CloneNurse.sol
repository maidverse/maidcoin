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
		    nurseType: ntype,
		    supportPower: 0,
		    masterAccReward: _update() * power / 1e18,
		    supporterAccReward: 0,
		    supportable: supportable
		}));
		
		totalPower += power;
		
		_mint(msg.sender, id);
    }
    
    function changeSupportable(uint id, bool supportable) override external {
		require(msg.sender == ownerOf(id));
		nurses[id].supportable = supportable;
    }
    
    function moveSupporters(uint from, uint to, uint number) override public {
        
		require(msg.sender == ownerOf(from) && from != to);
		
		claim(from);
		claim(to);

		Supporter[] storage fromSup = supporters[from];
		Supporter[] storage toSup = supporters[to];

		mapping(address => uint) storage fromAddrToSup = addrToSupporter[from];
		mapping(address => uint) storage toAddrToSup = addrToSupporter[to];

		uint totalLPTokenAmount = 0;

		require(fromSup.length <= number);
		for (uint i = number - 1; i > 0; i -= 1) {
			Supporter memory supporter = fromSup[i];
			
			delete fromAddrToSup[supporter.addr];
			toAddrToSup[supporter.addr] = toSup.length;
			
			toSup.push(supporter);
			fromSup.pop();
			
			totalLPTokenAmount += supporter.lpTokenAmount;
		}
		
		uint supportPower = totalLPTokenAmount * ratio.lpTokenToNursePower() / ratio.precision();

		nurses[from].supportPower -= supportPower;
		nurses[to].supportPower += supportPower;
    }
    
    function destroy(uint id, uint supportersTo) override external {
		
		require(msg.sender == ownerOf(id) && supportersTo != id);

		// need to move supporters to another nurse
		moveSupporters(id, supportersTo, supporters[id].length);
		
		maidCoin.mintForCloneNurseDestruction(msg.sender, nurseTypes[nurses[id].nurseType].destroyReturn);
		
		totalPower -= originPower(id);
		_burn(id);
    }
    
    function support(uint id, uint lpTokenAmount) override external {
       
		claim(id);
	    
		uint supporterId = addrToSupporter[id][msg.sender];
		
		Supporter[] storage sups = supporters[id];
		
		if (sups[supporterId].addr != msg.sender) { // new supporter

			supporterId = sups.length;

			sups.push(Supporter({
				addr: msg.sender,
				lpTokenAmount: lpTokenAmount,
				accReward: 0
			}));

			addrToSupporter[id][msg.sender] = supporterId;

		} else { // add amount
			supporters[id][supporterId].lpTokenAmount += lpTokenAmount;
		}
		
		uint supportPower = lpTokenAmount * ratio.lpTokenToNursePower() / ratio.precision();
		nurses[id].supportPower += supportPower;
		totalPower += supportPower;

		// need approve
		lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);
		
		emit Support(msg.sender, id, lpTokenAmount);
    }
    
    function desupport(uint id, uint lpTokenAmount) override external {
        
		claim(id);
        
		uint supporterId = addrToSupporter[id][msg.sender];
		
		Supporter storage supporter = supporters[id][supporterId];
		
		require(supporter.addr == msg.sender);

		supporter.lpTokenAmount -= lpTokenAmount;

		if (supporter.lpTokenAmount == 0) {
			delete supporters[id][supporterId];
			delete addrToSupporter[id][msg.sender];
		}

		uint supportPower = lpTokenAmount * ratio.lpTokenToNursePower() / ratio.precision();
		nurses[id].supportPower -= supportPower;
		totalPower -= supportPower;

		lpToken.transfer(msg.sender, lpTokenAmount);

		emit Desupport(msg.sender, id, lpTokenAmount);
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
        
        address master = ownerOf(id);
        if (master == address(0)) {
            return 0;
        }
        
        Nurse memory nurse = nurses[id];
        
        uint _originPower = originPower(nurse.nurseType);
		uint power = _originPower + nurse.supportPower;
        uint acc = accRewardPerShare() * power / 1e18;
        uint totalReward = 0;
        
        // owner
		if (master == msg.sender) {
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
    
    function claim(uint id) override public {
        
        address master = ownerOf(id);
        require(master != address(0));
        
        Nurse storage nurse = nurses[id];
        require(master != address(0));
        
        uint _originPower = originPower(nurse.nurseType);
		uint power = _originPower + nurse.supportPower;
        uint acc = _update() * power / 1e18;
        uint totalReward = 0;
        
		uint masterAccReward = acc * _originPower / power - nurse.masterAccReward;
		nurse.masterAccReward += masterAccReward;
	    
		uint supporterAccReward = acc * nurse.supportPower / power - nurse.supporterAccReward;
		nurse.supporterAccReward += supporterAccReward;
        
        // owner
		if (master == msg.sender) {
			totalReward += masterAccReward;
		} else {
		    maidCoin.transfer(master, masterAccReward);
		}

		// supporter
		uint supporterId = addrToSupporter[id][msg.sender];
		if (supporterId != 0) {
			Supporter storage supporter = supporters[id][supporterId];
			uint reward = supporterAccReward * supporter.lpTokenAmount * ratio.lpTokenToNursePower() / ratio.precision() / nurse.supportPower - supporter.accReward;
			totalReward += reward;
			supporter.accReward += reward;
		}
		
		maidCoin.transfer(msg.sender, totalReward);
    }
}
