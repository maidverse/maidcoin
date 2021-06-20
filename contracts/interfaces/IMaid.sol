// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

import "../uniswapv2/interfaces/IUniswapV2Pair.sol";

interface IMaid {
    event ChangeLPTokenToMaidPower(uint256 value);
    event Support(uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(uint256 indexed id, uint256 lpTokenAmount);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external view returns (bytes32);
    function PERMIT_ALL_TYPEHASH() external view returns (bytes32);
    
    function nonces(uint256 id) external view returns (uint256);
    function noncesForAll(address owner) external view returns (uint256);

    function lpToken() external view returns (IUniswapV2Pair);
    function lpTokenToMaidPower() external view returns (uint256);

    function maids(uint256 id)
        external
        view
        returns (
            uint256 originPower,
            uint256 supportedLPTokenAmount
        );

    function powerOf(uint256 id) external view returns (uint256);

    function support(uint256 id, uint256 lpTokenAmount) external;
    function supportWithPermit(
        uint256 id, 
        uint256 lpTokenAmount, 
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s) external;
    function desupport(uint256 id, uint256 lpTokenAmount) external;

    function permit(
        address spender,
        uint256 id,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function permitAll(
        address owner,
        address spender,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function setApprovalForAll(address operator, bool _approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
