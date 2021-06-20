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
    mapping(address => uint256) public override pidByAddr;
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
        PoolInfo memory pool = poolInfo[pid];
        UserInfo memory user = userInfo[pid][userId];
        (uint256 accRewardPerShare, uint256 supply) = (pool.accRewardPerShare, pool.supply);
        if (block.number > pool.lastRewardBlock && supply != 0) {
            uint256 reward = ((block.number - pool.lastRewardBlock) * rewardPerBlock() * pool.allocPoint) /
                totalAllocPoint;
            accRewardPerShare = accRewardPerShare + (reward * PRECISION) / supply;
        }
        if (pid == 1 && supply == 0) return 0;
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
        uint256 pid = poolInfo.length;
        pidByAddr[addr] = pid;
        poolInfo.push(PoolInfo(addr, delegate, allocPoint, lastRewardBlock, 0, 0));
        emit Add(pid, addr, delegate, allocPoint);
    }

    function set(uint256 pid, uint256 allocPoint) public override onlyOwner {
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + allocPoint;
        poolInfo[pid].allocPoint = allocPoint;
        emit Set(pid, allocPoint);
    }

    function updatePool(PoolInfo storage pool, uint256 pid) internal {
        uint256 _lastRewardBlock = pool.lastRewardBlock;
        if (block.number <= _lastRewardBlock) {
            return;
        }
        uint256 supply = pool.supply;
        uint256 reward = ((block.number - _lastRewardBlock) * rewardPerBlock() * pool.allocPoint) / totalAllocPoint;
        if (supply == 0) {
            pool.lastRewardBlock = block.number;
            if (pid == 1) {
                maidCoin.mint(address(this), reward);
                winningBonus = reward;
            }
            return;
        }
        maidCoin.mint(address(this), reward);
        pool.accRewardPerShare = pool.accRewardPerShare + (reward * PRECISION) / supply;
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
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 _amount = user.amount;
        if (_amount > 0) {
            uint256 pending = ((user.amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
            safeRewardTransfer(msg.sender, pending);
        }
        if (pool.delegate) {
            require(pool.addr == msg.sender, "TheMaster: Not called by delegate");
        } else {
            IERC20(pool.addr).safeTransferFrom(msg.sender, address(this), amount);
        }
        _amount += amount;
        user.amount = _amount;
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
        emit Deposit(userId, pid, amount);
    }

    function withdraw(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][userId];
        uint256 _amount = user.amount;
        require(_amount >= amount, "TheMaster: Insufficient amount");
        updatePool(pool, pid);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        pool.supply -= amount;
        uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
        safeRewardTransfer(msg.sender, pending);
        _amount -= amount;
        user.amount = _amount;
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
        if (pool.delegate) {
            require(pool.addr == msg.sender, "TheMaster: Not called by delegate");
        } else {
            require(address(uint160(userId)) == msg.sender, "TheMaster: Not called by user");
            IERC20(pool.addr).safeTransfer(address(msg.sender), amount);
        }
        emit Withdraw(userId, pid, amount);
    }

    function emergencyWithdraw(uint256 pid) public override {
        PoolInfo storage pool = poolInfo[pid];
        require(!pool.delegate, "TheMaster: Pool should be non-delegate");
        // updatePool(pool, pid);
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        uint256 amounts = user.amount;
        pool.supply -= amounts;
        IERC20(pool.addr).safeTransfer(address(msg.sender), amounts);
        emit EmergencyWithdraw(msg.sender, pid, amounts);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    function claimWinningBonus(uint256 userId) public override returns (uint256 amount) {
        require(winningBonus > 0, "TheMaster: No winning bonus yet");
        require(userId == lastWinningBonusTaker && userId < WINNING_BONUS_TAKERS, "TheMaster: Not proper user");
        PoolInfo memory pool = poolInfo[1];
        require(pool.addr == msg.sender, "TheMaster: Not called by the pool");
        lastWinningBonusTaker++;
        amount = winningBonus / WINNING_BONUS_TAKERS;
        safeRewardTransfer(msg.sender, amount);
        emit ClaimWinningBonus(userId, amount);
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
