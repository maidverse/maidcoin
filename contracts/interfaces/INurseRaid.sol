// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./IMaids.sol";
import "./IMaidCoin.sol";
import "./INursePart.sol";
import "./IRNG.sol";

interface INurseRaid {
    event Create(
        uint256 indexed id,
        uint256 entranceFee,
        uint256 indexed nursePart,
        uint256 maxRewardCount,
        uint256 duration,
        uint256 endBlock
    );
    event Enter(address indexed challenger, uint256 indexed id, IMaids indexed maids, uint256 maidId);
    event Exit(address indexed challenger, uint256 indexed id);
    event ChangeMaidPowerToRaidReducedBlock(uint256 value);

    function maidsApproved(IMaids maids) external view returns (bool);

    function maidCoin() external view returns (IMaidCoin);

    function nursePart() external view returns (INursePart);

    function rng() external view returns (IRNG);

    function maidPowerToRaidReducedBlock() external view returns (uint256);

    function raidCount() external view returns (uint256);

    function create(
        uint256 entranceFee,
        uint256 nursePart,
        uint256 maxRewardCount,
        uint256 duration,
        uint256 endBlock
    ) external returns (uint256 id);

    function enterWithPermitAll(
        uint256 id,
        IMaids maids,
        uint256 maidId,
        uint256 deadline,
        uint8 v1,
        bytes32 r1,
        bytes32 s1,
        uint8 v2,
        bytes32 r2,
        bytes32 s2
    ) external;

    function enter(
        uint256 id,
        IMaids maids,
        uint256 maidId
    ) external;

    function checkDone(uint256 id) external view returns (bool);

    function exit(uint256 id) external;
}
