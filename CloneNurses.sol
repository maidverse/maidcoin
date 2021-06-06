// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CloneNursesInterface.sol";
import "./NursePartsInterface.sol";
import "./ERC721TokenReceiver.sol";

contract CloneNurses is CloneNursesInterface {
	
    uint8   constant public DECIMALS = 8;
    uint256 constant public COIN = 10 ** uint256(DECIMALS);
    uint256 constant public COIN_PER_BLOCK = 100;
    
	address public override masters;
	NursePartsInterface public override nurseParts;
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

	function changeNurseParts(address newNurseParts) external {
		require(msg.sender == masters);
		nurseParts = NursePartsInterface(newNurseParts);
	}
    
	function changeMaidCoin(address newMaidCoin) external {
		require(msg.sender == masters);
		maidCoin = newMaidCoin;
	}
    
	function changeLPToken(address newLPToken) external {
		require(msg.sender == masters);
		lpToken = newLPToken;
	}

	uint256 public totalPower = 0;

	struct NurseClass {
		uint256 partsCount;
		uint256 destroyReturn;
		uint256 originPower;
	}
	NurseClass[] public NurseClasses;

	struct Nurse {
		
		uint256 type;
		uint256 originPower;
		uint256 supportPower;
		
		uint256 lastRewardBlock;
		uint256 accCoinForOwner;
		uint256 accCoinPerSupporter;
	}
	Nurse[] public nurses;

	struct Supporter {
		uint256 lpTokenAmount;
		uint256 rewardDebt;
	}

	uint256[] public symbols;
	mapping(uint256 => uint256[]) internal idToSymbols;
	mapping(uint256 => uint256) internal symbolToIdIndex;
	mapping(uint256 => uint256[]) internal supporterToSymbols;

	mapping(uint256 => address) public idToOwner;
	mapping(address => uint256[]) public ownerToIds;
	mapping(uint256 => uint256) internal idToOwnerIndex;
	mapping(uint256 => address) private idToApproved;
	mapping(address => mapping(address => bool)) private ownerToOperators;

    constructor() {
        genesisBlock = block.number;
    }

    function createNurseClass(uint256 partsCount, uint256 destroyReturn, uint256 originPower) external override returns (uint256) {
        uint256 nurseType = nurseClasses.length;
		nurseClasses.push(NurseClass({
			partsCount: partsCount,
			destroyReturn: destroyReturn
			originPower: originPower
		}));
		return nurseType;
    }
    
    function balanceOf(address owner) public override view returns (uint256) {
		return ownerToIds[owner].length;
    }

    function ownerOf(uint256 id) public override view returns (address) {
        return idToOwner[id];
    }
    
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public override {
        transferFrom(from, to, id);
        uint32 size;
		assembly { size := extcodesize(to) }
		if (size > 0) {
			require(ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, data) == 0x150b7a02);
		}
    }
    
    function safeTransferFrom(address from, address to, uint256 id) external override {
        safeTransferFrom(from, to, id, "");
    }
    
    function transferFrom(address from, address to, uint256 id) public override {

        address owner = ownerOf(id);

        require(
			msg.sender == owner ||
			msg.sender == getApproved(id) ||
			isApprovedForAll(ownerOf(id), msg.sender) == true
		);
        
		require(from == owner && to != owner);
		
		delete idToApproved[id];
		emit Approval(from, address(0), id);
		
		uint256 index = idToOwnerIndex[id];
		uint256 lastIndex = balanceOf(from) - 1;
		
		uint256 lastId = ownerToIds[from][lastIndex];
		ownerToIds[from][index] = lastId;
		
		delete ownerToIds[from][lastIndex];

        uint256[] storage ids = ownerToIds[from];
		ids.length -= 1;
		
		idToOwnerIndex[lastId] = index;
		idToOwner[id] = to;

        ownerToIds[to].push(id);
		idToOwnerIndex[id] = ownerToIds[to].length - 1;
		
		emit Transfer(from, to, id);
    }
    
    function approve(address approved, uint256 id) external override {
		address owner = ownerOf(id);
		require(msg.sender == owner && approved != owner);
		idToApproved[id] = approved;
		emit Approval(owner, approved, id);
    }
    
    function setApprovalForAll(address operator, bool approved) external override {
		require(operator != msg.sender);
		if (approved == true) {
			ownerToOperators[msg.sender][operator] = true;
		} else {
			delete ownerToOperators[msg.sender][operator];
		}
		emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function getApproved(uint256 id) public override view returns (address) {
        return idToApproved[id];
    }
    
    function isApprovedForAll(address owner, address operator) public override view returns (bool) {
        return ownerToOperators[owner][operator] == true;
    }
    
    function assemble(uint256 nurseType) external override {
        nurseParts.burn(msg.sender, nurseType, nurseTypes[nurseType].partsCount);

		NurseClass memory nurseClass = nurseClasses[nurseType];
		
		uint id = nurses.length;
		nurses.push(Nurse({
			type: nurseType,
			originPower: nurseClass.originPower,
			supportPower: 0,
			accCoinForOwner: 0,
			accCoinForSupporter: 0
		}));

		uint256 symbol = symbols.length;
		symbols.push(id);
		idToSymbols[id].push(symbol);
		symbolToIdIndex[symbol] = idToSymbols[id].length - 1;

		idToOwner[id] = msg.sender;
        ownerToIds[msg.sender].push(id);
		idToOwnerIndex[id] = ownerToIds[msg.sender].length - 1;
		
		emit Transfer(address(0), msg.sender, id);
    }
    
    function destroy(uint256 id, uint256 supportersTo) external override {
		
        address owner = ownerOf(id);

		require(msg.sender == owner && supportersTo != id);
		
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

		emit Transfer(msg.sender, address(0), id);

		//TODO: need to move supporters to another nurse
    }

	function update(uint256 id) internal {
		Nurse storage nurse = nurses[id];
		uint256 multiplier = block.number - nurse.lastRewardBlock;
		uint256 power = nurse.originPower + nurse.supportPower;
        uint256 reward = multiplier * COIN_PER_BLOCK * power / totalPower;
        maidCoin.mint(address(this), reward);
		uint256 accCoin = reward * 1e12 / power;
		nurse.accCoinForOwner += accCoin * nurse.originPower / power;
		nurse.accCoinPerSupporter += accCoin * nurse.supportPower / power;
        nurse.lastRewardBlock = block.number;
	}

    function support(uint256 id, uint256 lpTokenAmount) external override {
        //TODO:
    }
    
    function desupport(uint256 id, uint256 lpTokenAmount) external override {
        //TODO:
    }
    
    function claimAmountOf(uint256 id) external view returns (uint256) {
        //TODO:
    }
    
    function claim(uint256 id) external {
        //TODO:
    }
}
