// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidCoinInterface.sol";

interface MasterCoinInterface {

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    function maidCoin() external view returns (MaidCoinInterface);
    
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256 balance);
    function transfer(address to, uint256 amount) external returns (bool success);
    function transferFrom(address from, address to, uint256 amount) external returns (bool success);
    function approve(address spender, uint256 amount) external returns (bool success);
    function allowance(address owner, address spender) external view returns (uint256 remaining);

    function claimCoinAmount() external view returns (uint256);
    function claim() external;

    function proposeMaid(uint256 power, uint256 price) external returns (uint256 proposalId);
    function voteMaid(uint256 proposalId) external;

    function proposeNurseClass(uint256 partsCount, uint256 destroyReturn, uint256 originPower) external returns (uint256 proposalId);
    function voteNurseClass(uint256 proposalId) external;

    function proposeNurseRaid(uint256 entranceFee, uint256 nurseType, uint256 endBlock) external returns (uint256 proposalId);
    function voteNurseRaid(uint256 proposalId) external;
}
