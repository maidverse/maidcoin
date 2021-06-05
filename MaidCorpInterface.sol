// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface MaidCorpInterface {

    event Deposit(address indexed owner, uint256 amount);
    event Withdraw(address indexed owner, uint256 amount);

    function maidCoin() external view returns (address);
    function lpToken() external view returns (address);
    
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
}
