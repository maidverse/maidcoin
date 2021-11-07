// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "./IMasterChefModule.sol";

interface IMaidData is IMasterChefModule {
    event Support(uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(uint256 indexed id, uint256 lpTokenAmount);
    event SetPower(uint256 indexed id, uint256 power);

    function maids() external view returns (IERC721);

    function maidInfo(uint256 id)
        external
        view
        returns (
            uint256 originPower,
            uint256 supportedLPTokenAmount,
            uint256 sushiRewardDebt
        );

    function powerAndLP(uint256 id) external view returns (uint256, uint256);

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

    function claimSushiReward(uint256 id) external;

    function pendingSushiReward(uint256 id) external view returns (uint256);
}
