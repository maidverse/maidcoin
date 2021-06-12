// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface INursePart is IERC1155 {
    
    event Mint(address indexed to, uint indexed id, uint amount);
    event Burn(address indexed from, uint indexed id, uint amount);
    
    function nurseRaid() external view returns (address);
    function cloneNurse() external view returns (address);
	
    function mint(address to, uint id, uint amount) external;
    function burn(address from, uint id, uint amount) external;
}
