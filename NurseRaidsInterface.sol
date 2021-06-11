// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./MaidsInterface.sol";
import "./NursePartsInterface.sol";

interface NurseRaidsInterface {

    event CreateRaid(uint256 indexed id, uint256 entranceFee, uint256 nurseType, uint256 duration, uint256 endBlock);
    event Enter(address indexed challenger, uint256 indexed id, uint256[] maids);
    event Exit(address indexed challenger, uint256 indexed id);

    function masters() external view returns (address);
    function maidCoin() external view returns (address);
    function maids() external view returns (MaidsInterface);
    function nurseParts() external view returns (NursePartsInterface);

    function createRaid(uint256 entranceFee, uint256 nurseType, uint256 duration, uint256 endBlock) external returns (uint256);
    function enter(uint256 id, uint256[] calldata maids) external returns (uint256);
    function checkDone(uint256 id) external returns (bool);
    function exit(uint256 id) external;
}
