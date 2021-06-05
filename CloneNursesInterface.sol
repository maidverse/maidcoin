// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NursePartsInterface.sol";

interface CloneNursesInterface {

    event Transfer(address indexed from, address indexed to, uint256 indexed nurseId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed nurseId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    function masters() external view returns (address);
    function nurseParts() external view returns (NursePartsInterface);
    function maidCoin() external view returns (address);
    function lpToken() external view returns (address);

    function createNurseType(uint256 partsCount, uint256 destroyReturn) external returns (uint256);
    
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 nurseId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 nurseId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 nurseId) external;
    function transferFrom(address from, address to, uint256 nurseId) external;
    function approve(address approved, uint256 nurseId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 nurseId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    function assemble(uint256 nurseType) external;
    function destroy(uint256 nurseId) external;

    function support(uint256 nurseId, uint256 lpTokenAmount) external;
    function desupport(uint256 nurseId, uint256 lpTokenAmount) external;
    
    function claimAmountOf(uint256 nurseId) external view returns (uint256);
    function claim(uint256 nurseId) external;
}
