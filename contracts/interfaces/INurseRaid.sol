// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "./IRatio.sol";
import "./IMaid.sol";
import "./IMaidCoin.sol";
import "./INursePart.sol";
import "./IRNG.sol";

interface INurseRaid {

    event Create(uint indexed id, uint entranceFee, uint nursePart, uint maxRewardCount, uint duration, uint endBlock);
    event Enter(address indexed challenger, uint indexed id, uint[] maids);
    event Exit(address indexed challenger, uint indexed id);
    
    function ratio() external view returns (IRatio);
    function maid() external view returns (IMaid);
    function maidCoin() external view returns (IMaidCoin);
    function nursePart() external view returns (INursePart);
    function rng() external view returns (IRNG);

    function create(uint entranceFee, uint nursePart, uint maxRewardCount, uint duration, uint endBlock) external returns (uint id);
    function enter(uint id, uint[] calldata maids) external;
    function checkDone(uint id) external view returns (bool);
    function exit(uint id) external;
}
