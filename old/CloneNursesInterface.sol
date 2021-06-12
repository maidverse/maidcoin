// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NursePartsInterface.sol";

interface CloneNursesInterface {

    event Transfer(address indexed from, address indexed to, uint256 indexed id);
    event Approval(address indexed owner, address indexed approved, uint256 indexed id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Assemble(address indexed owner, uint256 indexed id, uint256 nurseType, bool supportable);
    event Destroy(address indexed owner, uint256 indexed id);
    event Support(address indexed supporter, uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(address indexed supporter, uint256 indexed id, uint256 lpTokenAmount);
    event Claim(address indexed owner, uint256 indexed id, uint256 coinAmount);

    function masters() external view returns (address);
    function nurseParts() external view returns (NursePartsInterface);
    function maidCoin() external view returns (address);
    function lpToken() external view returns (LPTokenInterface);

    function createNurseType(uint256 partsCount, uint256 destroyReturn, uint256 defaultPower) external returns (uint256);
    
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 id) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 id, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 id) external;
    function transferFrom(address from, address to, uint256 id) external;
    function approve(address approved, uint256 id) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 id) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    function assemble(uint256 nurseType, bool supportable) external;
    function changeSupportable(uint256 id, bool supportable) external;
    function destroy(uint256 id, uint256 symbolTo) external;
    function moveSupporters(uint256 from, uint256 to, uint256 number) external;
    function support(uint256 id, uint256 lpTokenAmount) external;
    function desupport(uint256 id, uint256 lpTokenAmount) external;
    
    function claimCoinOf(uint256 id) external view returns (uint256);
    function claim(uint256 id) external;
}
