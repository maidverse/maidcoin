// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ITheMaster.sol";

contract TheMaster is Ownable, ITheMaster {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    struct PoolInfo {
        address addr;
        bool delegate;
        bool mintable;
        ISupportable supportable;
        uint8 supportingRatio;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
        uint256 supply;
    }

    uint256 private constant PRECISION = 1e20;

    uint256 public immutable override initialRewardPerBlock;
    uint256 public immutable override decreasingInterval;
    uint256 public immutable override startBlock;

    IMaidCoin public immutable override maidCoin;
    IRewardCalculator public override rewardCalculator;

    PoolInfo[] public override poolInfo;
    mapping(uint256 => mapping(uint256 => UserInfo)) public override userInfo;
    mapping(address => uint256) public override pidByAddr;
    uint256 public override totalAllocPoint;

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
        uint256 pending = ((user.amount * accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pool.supportingRatio == 0) {
            return pending;
        } else {
            return pending - ((pending * pool.supportingRatio) / 100);
        }
    }

    function rewardPerBlock() public view override returns (uint256) {
        if (address(rewardCalculator) != address(0)) {
            return rewardCalculator.rewardPerBlock();
        }
        uint256 era = (block.number - startBlock) / decreasingInterval;
        return initialRewardPerBlock / (era + 1);
    }

    function changeRewardCalculator(address addr) external override onlyOwner {
        rewardCalculator = IRewardCalculator(addr);
        emit ChangeRewardCalculator(addr);
    }

    function add(
        address addr,
        bool delegate,
        bool mintable,
        address supportable,
        uint8 supportingRatio,
        uint256 allocPoint
    ) external override onlyOwner {
        if (supportable != address(0)) {
            require(supportingRatio > 0 && supportingRatio <= 80, "TheMaster: outranged supportingRatio");
        } else {
            require(supportingRatio == 0, "TheMaster: not supportable pool");
        }
        massUpdatePools();
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint += allocPoint;
        uint256 pid = poolInfo.length;
        pidByAddr[addr] = pid;
        poolInfo.push(
            PoolInfo(
                addr,
                delegate,
                mintable,
                ISupportable(supportable),
                supportingRatio,
                allocPoint,
                lastRewardBlock,
                0,
                0
            )
        );
        emit Add(pid, addr, delegate, mintable, supportable, supportingRatio, allocPoint);
    }

    function set(uint256 pid, uint256 allocPoint) external override onlyOwner {
        massUpdatePools();
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + allocPoint;
        poolInfo[pid].allocPoint = allocPoint;
        emit Set(pid, allocPoint);
    }

    function updatePool(PoolInfo storage pool) internal {
        uint256 _lastRewardBlock = pool.lastRewardBlock;
        if (block.number <= _lastRewardBlock) {
            return;
        }
        uint256 supply = pool.supply;
        if (supply == 0 || pool.allocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 reward = ((block.number - _lastRewardBlock) * rewardPerBlock() * pool.allocPoint) / totalAllocPoint;
        maidCoin.mint(address(this), reward);
        pool.accRewardPerShare = pool.accRewardPerShare + (reward * PRECISION) / supply;
        pool.lastRewardBlock = block.number;
    }

    function massUpdatePools() internal {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(poolInfo[pid]);
        }
    }

    function deposit(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        require(address(pool.supportable) == address(0), "TheMaster: use support func");
        UserInfo storage user = userInfo[pid][userId];
        if (pool.delegate) {
            require(pool.addr == msg.sender, "TheMaster: Not called by delegate");
            _deposit(pool, user, amount, false);
        } else {
            require(address(uint160(userId)) == msg.sender, "TheMaster: deposit to your address");
            _deposit(pool, user, amount, true);
        }
        emit Deposit(userId, pid, amount);
    }

    function _deposit(
        PoolInfo storage pool,
        UserInfo storage user,
        uint256 amount,
        bool tokenTransfer
    ) internal {
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 _amount = user.amount;
        if (_amount > 0) {
            uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
            if (pending > 0) safeRewardTransfer(msg.sender, pending);
        }
        if (amount > 0) {
            if (tokenTransfer) {
                IERC20(pool.addr).safeTransferFrom(msg.sender, address(this), amount);
            }
            pool.supply += amount;
            _amount += amount;
            user.amount = _amount;
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
    }

    function withdraw(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        require(address(pool.supportable) == address(0), "TheMaster: use desupport func");
        UserInfo storage user = userInfo[pid][userId];
        if (pool.delegate) {
            require(pool.addr == msg.sender, "TheMaster: Not called by delegate");
            _withdraw(pool, user, amount, false);
        } else {
            require(address(uint160(userId)) == msg.sender, "TheMaster: Not called by user");
            _withdraw(pool, user, amount, true);
        }
        emit Withdraw(userId, pid, amount);
    }

    function _withdraw(
        PoolInfo storage pool,
        UserInfo storage user,
        uint256 amount,
        bool tokenTransfer
    ) internal {
        uint256 _amount = user.amount;
        require(_amount >= amount, "TheMaster: Insufficient amount");
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pending > 0) safeRewardTransfer(msg.sender, pending);
        if (amount > 0) {
            pool.supply -= amount;
            _amount -= amount;
            user.amount = _amount;
            if (tokenTransfer) {
                IERC20(pool.addr).safeTransfer(msg.sender, amount);
            }
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
    }

    function emergencyWithdraw(uint256 pid) external override {
        PoolInfo storage pool = poolInfo[pid];
        require(address(pool.supportable) == address(0), "TheMaster: use desupport func");
        require(!pool.delegate, "TheMaster: Pool should be non-delegate");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        uint256 amounts = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.supply -= amounts;
        IERC20(pool.addr).safeTransfer(msg.sender, amounts);
        emit EmergencyWithdraw(msg.sender, pid, amounts);
    }

    function support(
        uint256 pid,
        uint256 amount,
        uint256 supportTo
    ) external override {
        PoolInfo storage pool = poolInfo[pid];
        ISupportable supportable = pool.supportable;
        require(address(supportable) != address(0), "TheMaster: use deposit func");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 _amount = user.amount;
        if (_amount > 0) {
            uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
            if (pending > 0) {
                (address to, uint256 amounts) = supportable.shareRewards(pending, msg.sender, pool.supportingRatio);
                if (amounts > 0) safeRewardTransfer(to, amounts);
                safeRewardTransfer(msg.sender, pending - amounts);
            }
        }
        if (amount > 0) {
            if (_amount == 0) {
                supportable.setSupportingTo(msg.sender, supportTo, amount);
            } else {
                supportable.changeSupportedPower(msg.sender, int256(amount));
            }
            IERC20(pool.addr).safeTransferFrom(msg.sender, address(this), amount);
            pool.supply += amount;
            _amount += amount;
            user.amount = _amount;
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
        emit Support(msg.sender, pid, amount);
    }

    function desupport(uint256 pid, uint256 amount) external override {
        PoolInfo storage pool = poolInfo[pid];
        ISupportable supportable = pool.supportable;
        require(address(supportable) != address(0), "TheMaster: use withdraw func");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        uint256 _amount = user.amount;
        require(_amount >= amount, "TheMaster: Insufficient amount");
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pending > 0) {
            (address to, uint256 amounts) = supportable.shareRewards(pending, msg.sender, pool.supportingRatio);
            if (amounts > 0) safeRewardTransfer(to, amounts);
            safeRewardTransfer(msg.sender, pending - amounts);
        }
        if (amount > 0) {
            supportable.changeSupportedPower(msg.sender, -int256(amount));
            pool.supply -= amount;
            _amount -= amount;
            user.amount = _amount;
            IERC20(pool.addr).safeTransfer(msg.sender, amount);
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
        emit Desupport(msg.sender, pid, amount);
    }

    function emergencyDesupport(uint256 pid) external override {
        PoolInfo storage pool = poolInfo[pid];
        ISupportable supportable = pool.supportable;
        require(address(supportable) == address(0), "TheMaster: use emergencyWithdraw func");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        uint256 amounts = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.supply -= amounts;
        supportable.changeSupportedPower(msg.sender, -int256(amounts));
        IERC20(pool.addr).safeTransfer(msg.sender, amounts);
        emit EmergencyDesupport(msg.sender, pid, amounts);
    }

    function mint(address to, uint256 amount) external override {
        require(poolInfo[pidByAddr[msg.sender]].mintable, "TheMaster: called from un-mintable");
        maidCoin.mint(to, amount);
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
