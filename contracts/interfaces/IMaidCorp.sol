// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IRatio.sol";
import "./IMaidCoin.sol";

interface IMaidCorp {

    event Deposit(address indexed user, uint lpTokenAmount);
    event Withdraw(address indexed user, uint lpTokenAmount);
    
    function ratio() external view returns (IRatio);
    function maidCoin() external view returns (IMaidCoin);
    function lpToken() external view returns (IERC20);
    
    function deposit(uint lpTokenAmount) external;
    function withdraw(uint lpTokenAmount) external;
    
    function claimAmount() external view returns (uint);
    function claim() external;
}
