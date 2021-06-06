// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidsInterface.sol";
import "./ERC721TokenReceiver.sol";

contract Maids is MaidsInterface {

	mapping(uint256 => address) public idToOwner;
	mapping(address => uint256[]) public ownerToIds;
	mapping(uint256 => uint256) internal idToOwnerIndex;
	mapping(uint256 => address) private idToApproved;
	mapping(address => mapping(address => bool)) private ownerToOperators;

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
}
