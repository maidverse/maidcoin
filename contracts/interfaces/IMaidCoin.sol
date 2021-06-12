// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IRatio.sol";
import "./IMasterCoin.sol";

interface IMaidCoin is IERC20 {
	
    event Mint(address indexed to, uint amount);
    event Burn(address indexed from, uint amount);
    
    function ratio() external view returns (IRatio);
    function masterCoin() external view returns (IMasterCoin);
    
    function initialSupply() external view returns (uint);
    function maidCorpAccReward() external view returns (uint);
    function nurseRaidAccReward() external view returns (uint);
    
    function maidCorp() external view returns (address);
    function cloneNurse() external view returns (address);
    function maid() external view returns (address);
    function nurseRaid() external view returns (address);
    
    function mintForMaidCorp() external returns (uint);
    function mintForCloneNurse() external returns (uint);
    function burn(address from, uint amount) external;
}
