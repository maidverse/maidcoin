// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface MaidsInterface {

    event CreateMaid(uint256 indexed id, uint256 power, uint256 price);
    event BuyMaid(address indexed owner, uint256 indexed id);
    
    function masters() external view returns (address);
    function nurseRaids() external view returns (address);
    function lpToken() external view returns (LPTokenInterface);

    function createMaid(uint256 power, uint256 price) external;
    function buyMaid(uint256 id) external;
    
    function powerOf(uint256 id) external view returns (uint256);
    function totalPowerOf(address owner) external view returns (uint256);
    
    function support(uint256 id, uint256 lpTokenAmount) external;
    function desupport(uint256 id, uint256 lpTokenAmount) external;
}
