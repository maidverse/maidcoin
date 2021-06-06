// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface MaidsInterface {

    event Transfer(address indexed from, address indexed to, uint256 indexed id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function lpToken() external view returns (address);
    function createMaid(uint256 power, uint256 price) external;
    function buyMaid(uint256 id) external;
    
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 id) external view returns (address);
    function powerOf(uint256 id) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 id, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 id) external;
    function transferFrom(address from, address to, uint256 id) external;
    function approve(address approved, uint256 id) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 id) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    function support(uint256 id, uint256 lpTokenAmount) external;
    function desupport(uint256 id, uint256 lpTokenAmount) external;
}