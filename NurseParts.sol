// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NursePartsInterface.sol";
import "./ERC1155TokenReceiver.sol";

contract NurseParts is NursePartsInterface {
    
    address public override masters;
	address public override nurseRaids;
	address public override cloneNurses;

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

	function changeNurseRaids(address newCloneNurses) external {
		require(msg.sender == masters);
		cloneNurses = newCloneNurses;
	}
    
    mapping(uint256 => mapping(address => uint256)) private balances;
    mapping(address => mapping(address => bool)) private allowed;

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) override external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender));
        balances[id][from] -= value;
        balances[id][to] += value;
        emit TransferSingle(msg.sender, from, to, id, amount);
        
        uint32 size;
		assembly { size := extcodesize(to) }
		if (size > 0) {
			require(ERC1155TokenReceiver(to).onERC1155Received(msg.sender, from, id, value, data) == 0xf23a6e61);
		}
    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) override external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender));
        require(ids.length == values.length);
        
        for (uint256 i = 0; i < ids.length; i += 1) {
            uint256 id = ids[i];
            uint256 value = values[i];
            balances[id][from] -= value;
            balances[id][to] += value;
        }
        
        emit TransferBatch(operator, from, to, ids, values);
        
        uint32 size;
		assembly { size := extcodesize(to) }
		if (size > 0) {
			require(ERC1155TokenReceiver(to).onERC1155BatchReceived(msg.sender, from, ids, values, data) == 0xbc197c81);
		}
    }
    
    function balanceOf(address owner, uint256 id) override external view returns (uint256) {
        return balances[id][owner];
    }
    
    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids) override external view returns (uint256[] memory) {
        require(owners.length == ids.length);
        uint256[] memory balances = new uint256[](owners.length);
        for (uint256 i = 0; i < owners.length; i += 1) {
            balances[i] = balanceOf(owners[i], ids[i]);
        }
        return balances;
    }
    
    function setApprovalForAll(address operator, bool approved) override external {
        allowed[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function isApprovedForAll(address owner, address operator) override external view returns (bool) {
        return msg.sender == cloneNurses || allowed[owner][operator];
    }
    
    function mint(address to, uint256 id, uint256 value) external {
        require(msg.sender == nurseRaids);

        balances[id][to] += value;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
        
        uint32 size;
		assembly { size := extcodesize(to) }
		if (size > 0) {
			require(ERC1155TokenReceiver(to).onERC1155Received(msg.sender, address(0), id, value, data) == 0xf23a6e61);
		}
    }
}