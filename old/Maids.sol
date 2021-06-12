// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidsInterface.sol";
import "./LPTokenInterface.sol";
import "./ERC721TokenReceiver.sol";

contract Maids is MaidsInterface {

	mapping(uint256 => address) public idToOwner;
	mapping(address => uint256[]) public ownerToIds;
	mapping(uint256 => uint256) internal idToOwnerIndex;
	mapping(uint256 => address) private idToApproved;
	mapping(address => mapping(address => bool)) private ownerToOperators;
	
	address public override masters;
	address public override nurseRaids;
	LPTokenInterface public override lpToken;

	struct Maid {
		address owner;
		uint256 originPower;
		uint256 supportPower;
        uint256 initPrice;
	}
	Nurse[] public nurses;

	constructor() {
		masters = msg.sender;
	}

	function changeMasters(address newMasters) external {
		require(msg.sender == masters);
		masters = newMasters;
	}

	function changeNurseRaids(address newNurseRaids) external {
		require(msg.sender == masters);
		nurseRaids = newNurseRaids;
	}
    
	function changeLPToken(address lpTokenAddress) external {
		require(msg.sender == masters);
		lpToken = LPTokenInterface(lpTokenAddress);
	}

	function createMaid(uint256 power, uint256 price) external {
		require(msg.sender == masters);

		uint256 maidId = maids.length;
		maids.push(Maid({
			owner: address(0),
			originPower: power,
			supportPower: 0,
			initPrice: price
		}));

		emit CreateMaid(id, power, price);

		return maidId;
	}
	
    function buyMaid(uint256 id) external {

		Maid memory maid = maids[id];

		require(maid.owner == address(0));
		maidCoin.burn(msg.sender, maid.initPrice);

		maids[id].owner = msg.sender;

		idToOwner[id] = msg.sender;

        ownerToIds[msg.sender].push(id);
		idToOwnerIndex[id] = ownerToIds[msg.sender].length - 1;
		
		emit Transfer(address(0), msg.sender, id);
		emit BuyMaid(msg.sender, id);
	}

    function balanceOf(address owner) public override view returns (uint256) {
		return ownerToIds[owner].length;
    }

    function ownerOf(uint256 id) public override view returns (address) {
        return idToOwner[id];
    }

    function powerOf(uint256 id) public override view returns (uint256) {
		Maid memory maid = maids[id];
		return maid.originPower + maid.supportPower;
    }

    function totalPowerOf(address owner) public override view returns (uint256) {
		uint256[] memory ids = ownerToIds[msg.sender];
		uint256 length = ids.length;
		uint256 totalPower = 0;
		for (uint256 i = 0; i < length; i += 1) {
			totalPower += maid.originPower + maid.supportPower;
		}
		return totalPower;
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
	
    function support(uint256 id, uint256 lpTokenAmount) external override {
		Maid memory maid = maids[id];
		require(maid.owner == msg.sender);
		maids[id].supportPower += lpTokenAmount;

		// need approve
		lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);
	}

    function desupport(uint256 id, uint256 lpTokenAmount) external override {
		Maid memory maid = maids[id];
		require(maid.owner == msg.sender);
		maids[id].supportPower -= lpTokenAmount;
		lpToken.transferFrom(address(this), msg.sender, lpTokenAmount);
	}
}
