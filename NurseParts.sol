// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NursePartsInterface.sol";

contract NurseParts is NursePartsInterface {

    mapping(uint256 => mapping(address => uint256)) private balances;
    mapping(address => mapping(address => bool)) private allowed;

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) override external {

    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) override external {

    }
    
    function balanceOf(address owner, uint256 id) override external view returns (uint256) {
        return balances[id][owner];
    }
    
    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids) override external view returns (uint256[] memory) {

    }
    
    function setApprovalForAll(address operator, bool approved) override external {

    }
    
    function isApprovedForAll(address owner, address operator) override external view returns (bool) {

    }
}