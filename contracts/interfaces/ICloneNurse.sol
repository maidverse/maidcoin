// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./INursePart.sol";
import "./ITheMaster.sol";

interface ICloneNurse is IERC721 {
    event ChangeSupportable(uint256 indexed id, bool supportable);
    event Support(address indexed supporter, uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(address indexed supporter, uint256 indexed id, uint256 lpTokenAmount);
    event ChangeLPTokenToNursePower(uint256 value);

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

    function assemble(uint256 nursePart, bool supportable) external returns (uint256 id);

    function changeSupportable(uint256 id, bool supportable) external;

    function moveSupporters(
        uint256 from,
        uint256 to,
        uint256 number
    ) external;

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

    function desupport(uint256 id, uint256 lpTokenAmount) external;

    function claimAmountOf(uint256 id) external view returns (uint256);

    function claim(uint256 id) external;
}
