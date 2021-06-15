// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./INursePart.sol";
import "./IMaidCoin.sol";

interface ICloneNurse is IERC721 {
    
    event ChangeLPToken(address addr);
    event ChangeLPTokenToNursePower(uint256 value);
    event ChangeSupportable(uint256 indexed id, bool supportable);
    event Support(
        address indexed supporter,
        uint256 indexed id,
        uint256 lpTokenAmount
    );
    event Desupport(
        address indexed supporter,
        uint256 indexed id,
        uint256 lpTokenAmount
    );

    function nursePart() external view returns (INursePart);

    function maidCoin() external view returns (IMaidCoin);

    function lpToken() external view returns (IERC20);

    function lpTokenToNursePower() external view returns (uint256);

    function assemble(uint256 nursePart, bool supportable)
        external
        returns (uint256 id);

    function changeSupportable(uint256 id, bool supportable) external;

    function moveSupporters(
        uint256 from,
        uint256 to,
        uint256 number
    ) external;

    function destroy(uint256 id, uint256 supportersTo) external;

    function support(uint256 id, uint256 lpTokenAmount) external;

    function desupport(uint256 id, uint256 lpTokenAmount) external;

    function claimAmountOf(uint256 id) external view returns (uint256);

    function claim(uint256 id) external;
}
