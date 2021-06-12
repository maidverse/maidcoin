// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMaidCoin is IERC20 {
	
    event Mint(address indexed to, uint amount);
    event Burn(address indexed from, uint amount);
    
    function initialSupply() external view returns (uint);
    
    function masters() external view returns (address);
    function maidCorp() external view returns (address);
    function cloneNurse() external view returns (address);
    function maid() external view returns (address);
    function nurseRaid() external view returns (address);
    
    function mint(address to, uint amount) external;
    function burn(address from, uint amount) external;
}
