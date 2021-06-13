// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IRatio.sol";
import "./IMaidCoin.sol";

interface IMaid is IERC721 {
    event Support(uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(uint256 indexed id, uint256 lpTokenAmount);

    function ratio() external view returns (IRatio);

    function maidCoin() external view returns (IMaidCoin);

    function lpToken() external view returns (IERC20);

    function firstBuy(uint256 id) external;

    function powerOf(uint256 id) external view returns (uint256);

    function support(uint256 id, uint256 lpTokenAmount) external;

    function desupport(uint256 id, uint256 lpTokenAmount) external;
}
