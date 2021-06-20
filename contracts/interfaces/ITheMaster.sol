// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

import "./IMaidCoin.sol";

interface ITheMaster {
    event ChangeRewardCalculator(address calculator);
    event Add(uint256 indexed pid, address addr, bool indexed delegate, uint256 allocPoint);
    event Set(uint256 indexed pid, uint256 allocPoint);
    event Deposit(uint256 indexed userId, uint256 indexed pid, uint256 amount);
    event Withdraw(uint256 indexed userId, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event ClaimWinningBonus(uint256 indexed userId, uint256 amount);

    function WINNING_BONUS_TAKERS() external view returns (uint8);

    function initialRewardPerBlock() external view returns (uint256);

    function decreasingInterval() external view returns (uint256);

    function startBlock() external view returns (uint256);

    function maidCoin() external view returns (IMaidCoin);

    function rewardCalculator() external view returns (address);

    function poolInfo(uint256 pid)
        external
        view
        returns (
            address addr,
            bool delegate,
            uint256 allocPoint,
            uint256 lastRewardBlock,
            uint256 accRewardPerShare,
            uint256 supply
        );

    function userInfo(uint256 pid, uint256 user) external view returns (uint256 amount, uint256 rewardDebt);

    function pidByAddr(address addr) external view returns (uint256 pid);

    function totalAllocPoint() external view returns (uint256);

    function winningBonus() external view returns (uint256);

    function lastWinningBonusTaker() external view returns (uint256);

    function pendingReward(uint256 pid, uint256 user) external view returns (uint256);

    function rewardPerBlock() external view returns (uint256);

    function changeRewardCalculator(address addr) external;

    function add(
        address addr,
        bool delegate,
        uint256 allocPoint
    ) external;

    function set(uint256 pid, uint256 allocPoint) external;

    function depositWithPermit(
        uint256 pid,
        uint256 amount,
        address userId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function deposit(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) external;

    function withdraw(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) external;

    function emergencyWithdraw(uint256 pid) external;

    function claimWinningBonus(uint256 user) external returns (uint256 amount);
}
