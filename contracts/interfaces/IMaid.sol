// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMaid is IERC721 {
    event ChangeLPToken(address addr);
    event ChangeLPTokenToMaidPower(uint256 value);
    event Support(uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(uint256 indexed id, uint256 lpTokenAmount);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function PERMIT_TYPEHASH() external view returns (bytes32);

    function lpToken() external view returns (IERC20);

    function lpTokenToMaidPower() external view returns (uint256);

    function nonces(uint256 id) external view returns (uint256);

    function maids(uint256 id)
        external
        view
        returns (
            uint256 originPower,
            uint256 supportedLPTokenAmount
        );

    function powerOf(uint256 id) external view returns (uint256);

    function support(uint256 id, uint256 lpTokenAmount) external;

    function desupport(uint256 id, uint256 lpTokenAmount) external;

    function permit(
        address spender,
        uint256 id,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
