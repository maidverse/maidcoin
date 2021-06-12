// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IRatio.sol";
import "./IMaidCoin.sol";

interface IMaid is IERC721 {
    
    event Support(uint indexed id, uint lpTokenAmount);
    event Desupport(uint indexed id, uint lpTokenAmount);
    
    function ratio() external view returns (IRatio);
    function maidCoin() external view returns (IMaidCoin);
    function lpToken() external view returns (IERC20);
    
    function mint(uint power, uint initialPrice) external returns (uint id);
    function firstBuy(uint id) external;
    
    function powerOf(uint id) external view returns (uint);
    
    function support(uint id, uint lpTokenAmount) external;
    function desupport(uint id, uint lpTokenAmount) external;
}
