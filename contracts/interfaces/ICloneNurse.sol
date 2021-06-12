// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IRatio.sol";
import "./INursePart.sol";
import "./IMaidCoin.sol";

interface ICloneNurse is IERC721 {
    
    event ChangeSupportable(uint indexed id, bool supportable);
    event Support(address indexed supporter, uint indexed id, uint lpTokenAmount);
    event Desupport(address indexed supporter, uint indexed id, uint lpTokenAmount);
    
    function ratio() external view returns (IRatio);
    function nursePart() external view returns (INursePart);
    function maidCoin() external view returns (IMaidCoin);
    function lpToken() external view returns (IERC20);
    
    function assemble(uint nursePart, bool supportable) external returns (uint id);
    function changeSupportable(uint id, bool supportable) external;
    function moveSupporters(uint from, uint to, uint256 number) external;
    function destroy(uint id, uint symbolTo) external;
    
    function support(uint id, uint lpTokenAmount) external;
    function desupport(uint id, uint lpTokenAmount) external;
    
    function claimAmountOf(uint id) external view returns (uint);
    function claim(uint id) external;
}
