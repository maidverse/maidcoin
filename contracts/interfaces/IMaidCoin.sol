// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IRatio.sol";
import "./IMasterCoin.sol";

interface IMaidCoin is IERC20 {
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    function ratio() external view returns (IRatio);

    function masterCoin() external view returns (IMasterCoin);

    function initialSupply() external view returns (uint256);

    function maidCorpAccReward() external view returns (uint256);

    function nurseRaidAccReward() external view returns (uint256);

    function maidCorp() external view returns (address);

    function cloneNurse() external view returns (address);

    function maid() external view returns (address);

    function nurseRaid() external view returns (address);

    function mintForMaidCorp() external returns (uint256);

    function mintForCloneNurse() external returns (uint256);

    function mintForCloneNurseDestruction(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}
