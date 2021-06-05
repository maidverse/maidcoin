// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidsInterface.sol";

contract Maids is MaidsInterface {

	mapping(uint256 => address) public maidIdToOwner;
	mapping(address => uint256[]) public ownerToMaidIds;
	mapping(uint256 => uint256) internal maidIdToMaidIdsIndex;
	mapping(uint256 => address) private maidIdToApproved;
	mapping(address => mapping(address => bool)) private ownerToOperatorToApprovedForAll;

    function balanceOf(address owner) public override view returns (uint256) {
		return ownerToMaidIds[owner].length;
    }

    function ownerOf(uint256 maidId) public override view returns (address) {
        return maidIdToOwner[maidId];
    }
    
    function safeTransferFrom(address from, address to, uint256 maidId, bytes memory data) public override {
        transferFrom(from, to, maidId);
        uint32 size;
		assembly { size := extcodesize(to) }
		if (size > 0) {
			require(ERC721TokenReceiver(to).onERC721Received(msg.sender, from, maidId, data) == 0x150b7a02);
		}
    }
    
    function safeTransferFrom(address from, address to, uint256 maidId) external override {
        safeTransferFrom(from, to, maidId, "");
    }
    
    function transferFrom(address from, address to, uint256 maidId) public override {

        address owner = ownerOf(maidId);

        require(
			msg.sender == owner ||
			msg.sender == getApproved(maidId) ||
			isApprovedForAll(ownerOf(maidId), msg.sender) == true
		);
        
		require(from == owner && to != owner);
		
		delete maidIdToApproved[maidId];
		emit Approval(from, address(0), maidId);
		
		uint256 index = maidIdToMaidIdsIndex[maidId];
		uint256 lastIndex = balanceOf(from) - 1;
		
		uint256 lastItemId = ownerToMaidIds[from][lastIndex];
		ownerToMaidIds[from][index] = lastItemId;
		
		delete ownerToMaidIds[from][lastIndex];

        uint256[] storage maidIds = ownerToMaidIds[from];
		maidIds.length -= 1;
		
		maidIdToMaidIdsIndex[lastItemId] = index;
		maidIdToOwner[maidId] = to;

        ownerToMaidIds[to].push(maidId);
		maidIdToMaidIdsIndex[maidId] = ownerToMaidIds[to].length - 1;
		
		emit Transfer(from, to, maidId);
    }
    
    function approve(address approved, uint256 maidId) external override {
		address owner = ownerOf(maidId);
		require(msg.sender == owner && approved != owner);
		maidIdToApproved[maidId] = approved;
		emit Approval(owner, approved, maidId);
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
    
    function getApproved(uint256 maidId) public override view returns (address) {
        return maidIdToApproved[maidId];
    }
    
    function isApprovedForAll(address owner, address operator) public override view returns (bool) {
        return ownerToOperatorToApprovedForAll[owner][operator] == true;
    }
}
