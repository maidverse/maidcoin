// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

import "./IMaidCoin.sol";
import "./IRewardCalculator.sol";
import "./ISupportable.sol";

interface ITheMaster {
    event ChangeRewardCalculator(address addr);

    event Add(
        uint256 indexed pid,
        address addr,
        bool indexed delegate,
        bool indexed mintable,
        address supportable,
        uint256 allocPoint
    );
    event Set(uint256 indexed pid, address supportable, uint256 allocPoint);
    event Deposit(uint256 indexed userId, uint256 indexed pid, uint256 amount);
    event Withdraw(uint256 indexed userId, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    event Support(address indexed supporter, uint256 indexed pid, uint256 amount);
    event Desupport(address indexed supporter, uint256 indexed pid, uint256 amount);

    event SetIsSupporterPool(uint256 indexed pid, bool indexed status);

    function initialRewardPerBlock() external view returns (uint256);

    function decreasingInterval() external view returns (uint256);

    function startBlock() external view returns (uint256);

    function maidCoin() external view returns (IMaidCoin);

    function rewardCalculator() external view returns (IRewardCalculator);

    function poolInfo(uint256 pid)
        external
        view
        returns (
            address addr,
            bool delegate,
            bool mintable,
            ISupportable supportable,
            uint256 allocPoint,
            uint256 lastRewardBlock,
            uint256 accRewardPerShare,
            uint256 supply
        );

    function userInfo(uint256 pid, uint256 user) external view returns (uint256 amount, uint256 rewardDebt);

    function pidByAddr(address addr) external view returns (uint256 pid);

    function totalAllocPoint() external view returns (uint256);

    function pendingReward(uint256 pid, uint256 userId) external view returns (uint256);

    function rewardPerBlock() external view returns (uint256);

    function changeRewardCalculator(address addr) external;

    function add(
        address addr,
        bool delegate,
        bool mintable,
        address supportable,
        uint256 allocPoint
    ) external;

    function set(
        uint256 pid,
        address supportable,
        uint256 allocPoint
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

    function support(
        uint256 pid,
        uint256 amount,
        uint256 supportTo
    ) external;

    function desupport(uint256 pid, uint256 amount) external;

    function mint(address to, uint256 amount) external;
}
