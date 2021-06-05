// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CloneNursesInterface.sol";
import "./NursePartsInterface.sol";
import "./ERC721TokenReceiver.sol";

contract CloneNurses is CloneNursesInterface {

    uint256 immutable public genesisBlock;
    
	address public override masters;
	NursePartsInterface public override nurseParts;
	address public override maidCoin;
	address public override lpToken;
    
	constructor() {
		masters = msg.sender;
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

	struct NurseType {
		uint256 partsCount;
		uint256 destroyReturn;
	}

	NurseType[] public nurseTypes;

	mapping(uint256 => address) public nurseIdToOwner;
	mapping(address => uint256[]) public ownerToNurseIds;
	mapping(uint256 => uint256) internal nurseIdToNurseIdsIndex;
	mapping(uint256 => address) private nurseIdToApproved;
	mapping(address => mapping(address => bool)) private ownerToOperatorToApprovedForAll;

    constructor() {
        genesisBlock = block.number;
    }

    function createNurseType(uint256 partsCount, uint256 destroyReturn) external override returns (uint256) {
        uint256 nurseType = nurseTypes.length;
		nurseTypes.push(NurseType({
			partsCount: partsCount,
			destroyReturn: destroyReturn
		}));
		return nurseType;
    }
    
    function balanceOf(address owner) public override view returns (uint256) {
		return ownerToNurseIds[owner].length;
    }

    function ownerOf(uint256 nurseId) public override view returns (address) {
        return nurseIdToOwner[nurseId];
    }
    
    function safeTransferFrom(address from, address to, uint256 nurseId, bytes memory data) public override {
        transferFrom(from, to, nurseId);
        uint32 size;
		assembly { size := extcodesize(to) }
		if (size > 0) {
			require(ERC721TokenReceiver(to).onERC721Received(msg.sender, from, nurseId, data) == 0x150b7a02);
		}
    }
    
    function safeTransferFrom(address from, address to, uint256 nurseId) external override {
        safeTransferFrom(from, to, nurseId, "");
    }
    
    function transferFrom(address from, address to, uint256 nurseId) public override {

        address owner = ownerOf(nurseId);

        require(
			msg.sender == owner ||
			msg.sender == getApproved(nurseId) ||
			isApprovedForAll(ownerOf(nurseId), msg.sender) == true
		);
        
		require(from == owner && to != owner);
		
		delete nurseIdToApproved[nurseId];
		emit Approval(from, address(0), nurseId);
		
		uint256 index = nurseIdToNurseIdsIndex[nurseId];
		uint256 lastIndex = balanceOf(from) - 1;
		
		uint256 lastItemId = ownerToNurseIds[from][lastIndex];
		ownerToNurseIds[from][index] = lastItemId;
		
		delete ownerToNurseIds[from][lastIndex];

        uint256[] storage nurseIds = ownerToNurseIds[from];
		nurseIds.length -= 1;
		
		nurseIdToNurseIdsIndex[lastItemId] = index;
		nurseIdToOwner[nurseId] = to;

        ownerToNurseIds[to].push(nurseId);
		nurseIdToNurseIdsIndex[nurseId] = ownerToNurseIds[to].length - 1;
		
		emit Transfer(from, to, nurseId);
    }
    
    function approve(address approved, uint256 nurseId) external override {
		address owner = ownerOf(nurseId);
		require(msg.sender == owner && approved != owner);
		nurseIdToApproved[nurseId] = approved;
		emit Approval(owner, approved, nurseId);
    }
    
    function setApprovalForAll(address operator, bool approved) external override {
		require(operator != msg.sender);
		if (approved == true) {
			ownerToOperatorToApprovedForAll[msg.sender][operator] = true;
		} else {
			delete ownerToOperatorToApprovedForAll[msg.sender][operator];
		}
		emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function getApproved(uint256 nurseId) public override view returns (address) {
        return nurseIdToApproved[nurseId];
    }
    
    function isApprovedForAll(address owner, address operator) public override view returns (bool) {
        return ownerToOperatorToApprovedForAll[owner][operator] == true;
    }
    
    function assemble(uint256 nurseType) external override {
        //TODO:
    }
    
    function destroy(uint256 nurseId) external override {
        //TODO:
    }

    function support(uint256 nurseId, uint256 lpTokenAmount) external override {
        //TODO:
    }
    
    function desupport(uint256 nurseId, uint256 lpTokenAmount) external override {
        //TODO:
    }
    
    function claimAmountOf(uint256 nurseId) external view returns (uint256) {
        //TODO:
    }
    
    function claim(uint256 nurseId) external {
        //TODO:
    }
}
