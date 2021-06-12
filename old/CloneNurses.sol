// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CloneNursesInterface.sol";
import "./NursePartsInterface.sol";
import "./LPTokenInterface.sol";
import "./ERC721TokenReceiver.sol";

contract CloneNurses is CloneNursesInterface {
	
    
    function assemble(uint256 nurseType, bool supportable) external override {
        nurseParts.burn(msg.sender, nurseType, nurseTypes[nurseType].partsCount);

		NurseClass memory nurseClass = nurseClasses[nurseType];
		
		uint256 id = nurses.length;
        uint256 _accCoin = update();

		nurses.push(Nurse({
			type: nurseType,
			originPower: nurseClass.originPower,
			supportPower: 0,
			accCoinForOwner: _accCoin * nurseClass.originPower / PRECISION,
			accCoinForSupporter: 0,
			supportable: supportable
		}));

		supporters[id].push(Supporter({
			addr: address(0),
			lpTokenAmount: 0,
			rewardBlock: 0,
			rewardDebt: 0
		}));

		totalPower += nurseClass.originPower;

		idToOwner[id] = msg.sender;

        ownerToIds[msg.sender].push(id);
		idToOwnerIndex[id] = ownerToIds[msg.sender].length - 1;
		
		emit Transfer(address(0), msg.sender, id);
    }
	
    function changeSupportable(uint256 id, bool supportable) external override {
		require(msg.sender == ownerOf(id));
		nurses[id].supportable = supportable;
	}

	function updateAccCoin(Nurse storage nurse) internal {

        uint256 _accCoin = update();

		uint256 power = nurse.originPower + nurse.supportPower;
        uint256 reward = _accCoin * power / PRECISION - (nurse.accCoinForOwner + nurse.accCoinForSupporter);
        maidCoin.mint(address(this), reward);
		
		uint256 accCoin = _accCoin * power / PRECISION;
		nurse.accCoinForOwner += accCoin * nurse.originPower / power;
		nurse.accCoinPerSupporter += accCoin * nurse.supportPower / power;
        nurse.lastRewardBlock = block.number;
	}

	function moveSupporters(uint256 from, uint256 to, uint256 number) public override {

		require(msg.sender == ownerOf(from) && from != to);

		Nurse storage fromNurse = nurses[from];
		Nurse storage toNurse = nurses[to];
		
		Supporter[] storage fromSup = supporters[from];
		Supporter[] storage toSup = supporters[to];

		mapping(uint256 => uint256) storage fromAddrToSup = addrToSupporter[from];
		mapping(uint256 => uint256) storage toAddrToSup = addrToSupporter[to];

		uint256 supportPower = 0;

		require(fromSup.length <= number);
		for (uint256 i = number - 1; i > 0; i -= 1) {
			Supporter memory supporter = fromSup[i];
			delete fromAddrToSup[supporter.addr];
			toAddrToSup[supporter.addr] = toSub.length;
			toSup.push(supporter);
			supportPower += supporter.lpTokenAmount;
		}
		fromSup.length -= number;

		from.supportPower -= supportPower;
		to.supportPower += supportPower;
		
		updateAccCoin(from);
		updateAccCoin(to);
	}
    
    function destroy(uint256 id, uint256 supportersTo) external override {
		
		require(msg.sender == ownerOf(id) && supportersTo != id);
		
		delete idToApproved[id];
		emit Approval(msg.sender, address(0), id);
		
		uint256 index = idToOwnerIndex[id];
		uint256 lastIndex = balanceOf(msg.sender) - 1;
		
		uint256 lastId = ownerToIds[msg.sender][lastIndex];
		ownerToIds[msg.sender][index] = lastId;
		
		delete ownerToIds[msg.sender][lastIndex];

        uint256[] storage ids = ownerToIds[msg.sender];
		ids.length -= 1;
		
		idToOwnerIndex[lastId] = index;
		idToOwner[id] = address(0);

		Nurse memory nurse = nurses[id];

		totalPower -= nurse.originPower;
		maidCoin.mint(msg.sender, nurseClasses[nurse.type].destroyReturn);

		emit Transfer(msg.sender, address(0), id);

		// need to move supporters to another nurse
		moveSupporters(id, supportersTo, supporters[id].length);
    }

    function support(uint256 id, uint256 lpTokenAmount) external override {

		uint256 supporterId = addrToSupporter[id][msg.sender];
		if (supporterId == 0) { // new supporter

			Supporter[] sups = supporters[id];
			supporterId = sups.length;

			sups.push(Supporter({
				addr: msg.sender,
				lpTokenAmount: lpTokenAmount,
				rewardBlock: block.number,
				rewardDebt: 0
			}));

			addrToSupporter[id][msg.sender] = supporterId;

			emit Support(msg.sender, id, lpTokenAmount);

			return supporterId;

		} else { // add amount
			supporters[id][supporterId].lpTokenAmount += lpTokenAmount;
		}

		Nurse storage nurse = nurses[id];
		updateAccCoin(nurse);
		
		nurse.supportPower += lpTokenAmount;
		totalPower += lpTokenAmount;

		// need approve
		lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);
		
		emit Support(msg.sender, id, lpTokenAmount);
    }
    
    function desupport(uint256 id, uint256 lpTokenAmount) external override {
        
		uint256 supporterId = addrToSupporter[id][msg.sender];
		require(supporterId > 0);

		uint256 originAmount = supporters[id][supporterId].lpTokenAmount;
		supporters[id][supporterId].lpTokenAmount -= lpTokenAmount;

		Nurse storage nurse = nurses[id];
		updateAccCoin(nurse);
		
		nurse.supportPower -= lpTokenAmount;
		totalPower -= lpTokenAmount;

		lpToken.transferFrom(address(this), msg.sender, lpTokenAmount);

		emit Desupport(msg.sender, id, lpTokenAmount);

		if (originAmount == lpTokenAmount) {
			delete supporters[id][supporterId];
			addrToSupporter[id][msg.sender] = 0;
		}
    }
}
