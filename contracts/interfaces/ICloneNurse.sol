// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./INursePart.sol";
import "./ITheMaster.sol";

interface ICloneNurse is IERC721 {
    event ChangeSupportable(uint256 indexed id, bool supportable);
    event Support(uint256 indexed supportId, address indexed supporter, uint256 indexed id, uint256 lpTokenAmount);
    event IncreaseSupport(
        uint256 indexed supportId,
        address indexed supporter,
        uint256 indexed id,
        uint256 lpTokenAmount
    );
    event DecreaseSupport(
        uint256 indexed supportId,
        address indexed supporter,
        uint256 indexed id,
        uint256 lpTokenAmount
    );
    event ChangeLPTokenToNursePower(uint256 value);
    event Claim(uint256 indexed id, address indexed claimer, uint256 reward);
    event ClaimSupport(uint256 indexed supportId, address indexed claimer, uint256 reward);

    function nursePart() external view returns (INursePart);

    function maidCoin() external view returns (IMaidCoin);

    function theMaster() external view returns (ITheMaster);

    function lpToken() external view returns (IUniswapV2Pair);

    function lpTokenToNursePower() external view returns (uint256);

    function nurseTypes(uint256 typeId)
        external
        view
        returns (
            uint256 partCount,
            uint256 destroyReturn,
            uint256 power
        );

    function nurses(uint256 id)
        external
        view
        returns (
            uint256 nurseType,
            uint256 supportPower,
            uint256 masterAccReward,
            uint256 supporterAccReward,
            bool supportable
        );

    function supportInfo(uint256 supportId)
        external
        view
        returns (
            uint256 groupId,
            address supporter,
            uint256 lpTokenAmount,
            uint256 accReward
        );

    function idOfGroupId(uint256 groupId) external view returns (uint256 id);

    function destroyed(uint256 id) external view returns (bool);

    function assemble(uint256 nursePart, bool supportable) external returns (uint256 id);

    function changeSupportable(uint256 id, bool supportable) external;

    function destroy(uint256 id, uint256 supportersTo) external;

    function support(uint256 id, uint256 lpTokenAmount) external;

    function supportWithPermit(
        uint256 id,
        uint256 lpTokenAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function increaseSupport(uint256 supportId, uint256 lpTokenAmount) external;

    function increaseSupportWithPermit(
        uint256 supportId,
        uint256 lpTokenAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function decreaseSupport(uint256 supportId, uint256 lpTokenAmount) external;

    function claimableAmountOf(uint256 supportId) external view returns (uint256);

    function claimableSupportAmountOf(uint256 supportId) external view returns (uint256);

    function claim(uint256 supportId) external;

    function claimSupport(uint256 supportId) external;
}
