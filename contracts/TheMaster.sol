// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ITheMaster.sol";
import "./interfaces/IRewardCalculator.sol";

contract TheMaster is Ownable, ITheMaster {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    struct PoolInfo {
        address addr;
        bool delegate;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
        uint256 supply;
    }

    uint8 public constant override WINNING_BONUS_TAKERS = 30;
    uint256 private constant PRECISION = 1e20;

    uint256 public immutable override initialRewardPerBlock;
    uint256 public immutable override decreasingInterval;
    uint256 public immutable override startBlock;
    IMaidCoin public immutable override maidCoin;

    address public override rewardCalculator;

    PoolInfo[] public override poolInfo;
    mapping(uint256 => mapping(uint256 => UserInfo)) public override userInfo;
    uint256 public override totalAllocPoint;

    uint256 public override winningBonus;
    uint256 public override lastWinningBonusTaker;

    constructor(
        uint256 _initialRewardPerBlock,
        uint256 _decreasingInterval,
        uint256 _startBlock,
        IMaidCoin _maidCoin
    ) {
        initialRewardPerBlock = _initialRewardPerBlock;
        decreasingInterval = _decreasingInterval;
        startBlock = _startBlock;
        maidCoin = _maidCoin;
    }

    function pendingReward(uint256 pid, uint256 userId) external view override returns (uint256) {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][userId];
        (uint256 accRewardPerShare, uint256 supply) = (pool.accRewardPerShare, pool.supply);
        if (block.number > pool.lastRewardBlock && supply != 0) {
            uint256 reward = ((block.number - pool.lastRewardBlock) * rewardPerBlock() * pool.allocPoint) /
                totalAllocPoint;
            accRewardPerShare = accRewardPerShare + (reward * PRECISION) / supply;
        }
        return ((user.amount * accRewardPerShare) / PRECISION) - user.rewardDebt;
    }

    function rewardPerBlock() public view override returns (uint256) {
        if (rewardCalculator != address(0)) {
            return IRewardCalculator(rewardCalculator).rewardPerBlock();
        }
        uint256 era = (block.number - startBlock) / decreasingInterval;
        return initialRewardPerBlock / (era + 1);
    }

    function changeRewardCalculator(address addr) external override onlyOwner {
        rewardCalculator = addr;
        emit ChangeRewardCalculator(addr);
    }

    function add(
        address addr,
        bool delegate,
        uint256 allocPoint
    ) public override onlyOwner {
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint += allocPoint;
        poolInfo.push(PoolInfo(addr, delegate, allocPoint, lastRewardBlock, 0, 0));
    }

    function set(uint256 pid, uint256 allocPoint) public override onlyOwner {
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + allocPoint;
        poolInfo[pid].allocPoint = allocPoint;
    }

    function updatePool(PoolInfo storage pool, uint256 pid) internal {
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 supply = pool.supply;
        uint256 reward = ((block.number - pool.lastRewardBlock) * rewardPerBlock() * pool.allocPoint) / totalAllocPoint;
        if (supply == 0) {
            pool.lastRewardBlock = block.number;
            if (pid == 1) {
                maidCoin.mint(address(this), reward);
                winningBonus = reward;
            }
            return;
        }
        if (pid == 1) {
            reward -= winningBonus;
        }
        maidCoin.mint(address(this), reward);
        pool.accRewardPerShare = ((pool.accRewardPerShare + reward) * PRECISION) / supply;
        pool.lastRewardBlock = block.number;
    }

    function depositWithPermit(
        uint256 pid,
        uint256 amount,
        address userId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override {
        maidCoin.permit(msg.sender, address(this), amount, deadline, v, r, s);
        deposit(pid, amount, uint256(uint160(userId)));
    }

    function deposit(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][userId];
        updatePool(pool, pid);
        pool.supply += amount;
        if (user.amount > 0) {
            uint256 pending = ((user.amount * pool.accRewardPerShare) / PRECISION) - user.rewardDebt;
            safeRewardTransfer(msg.sender, pending);
        }
        if (pool.delegate) {
            require(pool.addr == msg.sender, "Not called by delegate");
        } else {
            IERC20(pool.addr).safeTransferFrom(address(msg.sender), address(this), amount);
        }
        user.amount += amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
        emit Deposit(userId, pid, amount);
    }

    function withdraw(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][userId];
        require(user.amount >= amount, "Insufficient amount");
        updatePool(pool, pid);
        pool.supply -= amount;
        uint256 pending = ((user.amount * pool.accRewardPerShare) / PRECISION) - user.rewardDebt;
        safeRewardTransfer(msg.sender, pending);
        user.amount -= amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / PRECISION;
        if (pool.delegate) {
            require(pool.addr == msg.sender, "Not called by delegate");
        } else {
            require(address(uint160(userId)) == msg.sender, "Not called by user");
            IERC20(pool.addr).safeTransfer(address(msg.sender), amount);
        }
        emit Withdraw(userId, pid, amount);
    }

    function emergencyWithdraw(uint256 pid) public override {
        PoolInfo storage pool = poolInfo[pid];
        require(!pool.delegate, "Pool should be non-delegate");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        IERC20(pool.addr).safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    function claimWinningBonus(uint256 user) public override {
        require(winningBonus > 0, "No winning bonus yet");
        require(user == lastWinningBonusTaker && user < WINNING_BONUS_TAKERS, "Not proper user");
        PoolInfo storage pool = poolInfo[1];
        require(pool.addr == msg.sender, "Not called by the pool");
        lastWinningBonusTaker++;
        safeRewardTransfer(msg.sender, winningBonus / WINNING_BONUS_TAKERS);
    }

    function safeRewardTransfer(address to, uint256 amount) internal {
        uint256 balance = maidCoin.balanceOf(address(this));
        if (amount > balance) {
            maidCoin.transfer(to, balance);
        } else {
            maidCoin.transfer(to, amount);
        }
    }
}
