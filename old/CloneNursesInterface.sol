// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./NursePartsInterface.sol";

interface CloneNursesInterface {

    event Assemble(address indexed owner, uint256 indexed id, uint256 nurseType, bool supportable);
    event Destroy(address indexed owner, uint256 indexed id);
    event Support(address indexed supporter, uint256 indexed id, uint256 lpTokenAmount);
    event Desupport(address indexed supporter, uint256 indexed id, uint256 lpTokenAmount);
    event Claim(address indexed owner, uint256 indexed id, uint256 coinAmount);

    function masters() external view returns (address);
    function nurseParts() external view returns (NursePartsInterface);
    function maidCoin() external view returns (address);
    function lpToken() external view returns (LPTokenInterface);

    function createNurseType(uint256 partsCount, uint256 destroyReturn, uint256 defaultPower) external returns (uint256);
    
    function assemble(uint256 nurseType, bool supportable) external;
    function changeSupportable(uint256 id, bool supportable) external;
    function destroy(uint256 id, uint256 symbolTo) external;
    function moveSupporters(uint256 from, uint256 to, uint256 number) external;
    function support(uint256 id, uint256 lpTokenAmount) external;
    function desupport(uint256 id, uint256 lpTokenAmount) external;
    
    function claimCoinOf(uint256 id) external view returns (uint256);
    function claim(uint256 id) external;
}
