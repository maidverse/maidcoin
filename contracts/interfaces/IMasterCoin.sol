// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IMaidCoin.sol";

interface IMasterCoin is IERC20 {
    
    event Claim(address indexed master, uint amount);
    
    function maidCoin() external view returns (IMaidCoin);
    function claimAmount(address master) external view returns (uint);
    function claim(address master) external;
}
