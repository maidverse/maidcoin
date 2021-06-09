// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface MaidCorpInterface {

    event Deposit(address indexed owner, uint256 lpTokenAmount);
    event Withdraw(address indexed owner, uint256 lpTokenAmount);

    function maidCoin() external view returns (address);
    function lpToken() external view returns (address);
    
    function deposit(uint256 lpTokenAmount) external;
    function withdraw(uint256 lpTokenAmount) external;
    
    function claimCoinAmount() external view returns (uint256 coinAmount);
    function claim(uint256 id) external;
}
