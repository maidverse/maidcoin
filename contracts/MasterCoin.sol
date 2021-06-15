// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMasterCoin.sol";

contract MasterCoin is ERC20("MasterCoin", "$MASTER"), IMasterCoin {
    uint256 public constant TOTAL_SUPPLY = 100 * 1e18;
    uint256 public immutable MAIDCOIN_INITIAL_SUPPLY;

    uint256 private accRewardPerShare; //precision : 100e18
    mapping(address => uint256) private rewardDebt;
    uint256 public lastBalance;

    IMaidCoin public override maidCoin;
    bool public isInitialSupplyBurned;

    constructor(address maidCoinAddr) {
        _mint(msg.sender, TOTAL_SUPPLY);
        maidCoin = IMaidCoin(maidCoinAddr);
        MAIDCOIN_INITIAL_SUPPLY = maidCoin.INITIAL_SUPPLY();
        isInitialSupplyBurned = false;
    }

    function _update() internal returns (uint256) {
        uint256 _lastBalance = lastBalance;
        uint256 currentBalance = maidCoin.balanceOf(address(this));
        uint256 _accRewardPerShare = accRewardPerShare;

        if (_lastBalance >= currentBalance) {
            return _accRewardPerShare <= MAIDCOIN_INITIAL_SUPPLY ? 0 : _accRewardPerShare - MAIDCOIN_INITIAL_SUPPLY;
        } else {
            _accRewardPerShare += (currentBalance - _lastBalance);
            accRewardPerShare = _accRewardPerShare;
            return _accRewardPerShare <= MAIDCOIN_INITIAL_SUPPLY ? 0 : _accRewardPerShare - MAIDCOIN_INITIAL_SUPPLY;
        }
    }

    function transfer(address to, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        (uint256 _accRewardPerShare, uint256 _balance1, uint256 _balance2) = transferRewards(msg.sender, to);
        if (_accRewardPerShare != 0) {
            rewardDebt[msg.sender] = (_accRewardPerShare * (_balance1 - amount)) / TOTAL_SUPPLY;
            rewardDebt[to] = (_accRewardPerShare * (_balance2 + amount)) / TOTAL_SUPPLY;
        }
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        (uint256 _accRewardPerShare, uint256 _balance1, uint256 _balance2) = transferRewards(from, to);
        if (_accRewardPerShare != 0) {
            rewardDebt[from] = (_accRewardPerShare * (_balance1 - amount)) / TOTAL_SUPPLY;
            rewardDebt[to] = (_accRewardPerShare * (_balance2 + amount)) / TOTAL_SUPPLY;
        }
        return super.transferFrom(from, to, amount);
    }

    function claimableAmount(address master) external view override returns (uint256) {
        uint256 _lastBalance = lastBalance;
        uint256 currentBalance = maidCoin.balanceOf(address(this));
        uint256 _accRewardPerShare = accRewardPerShare;

        if (_lastBalance >= currentBalance) {
            _accRewardPerShare = _accRewardPerShare <= MAIDCOIN_INITIAL_SUPPLY
                ? 0
                : _accRewardPerShare - MAIDCOIN_INITIAL_SUPPLY;
        } else {
            _accRewardPerShare += (currentBalance - _lastBalance);
            _accRewardPerShare = _accRewardPerShare <= MAIDCOIN_INITIAL_SUPPLY
                ? 0
                : _accRewardPerShare - MAIDCOIN_INITIAL_SUPPLY;
        }

        return (_accRewardPerShare * balanceOf(master)) / TOTAL_SUPPLY - rewardDebt[master];
    }

    function claim(address master) external override {
        uint256 _accRewardPerShare = _update();
        uint256 _balance = balanceOf(master);

        uint256 reward = (_accRewardPerShare * _balance) / TOTAL_SUPPLY - rewardDebt[master];
        if (reward > 0) {
            maidCoin.transfer(master, reward);
            emit Claim(master, reward);
        }
        rewardDebt[master] = (_accRewardPerShare * _balance) / TOTAL_SUPPLY;
        lastBalance = maidCoin.balanceOf(address(this));
    }

    function transferRewards(address user1, address user2)
        internal
        returns (
            uint256 _accRewardPerShare,
            uint256 _balance1,
            uint256 _balance2
        )
    {
        _accRewardPerShare = _update();
        if (_accRewardPerShare == 0) {
            lastBalance = maidCoin.balanceOf(address(this));
            return (0, 0, 0);
        }

        _balance1 = balanceOf(user1);
        _balance2 = balanceOf(user2);

        uint256 reward1 = (_accRewardPerShare * _balance1) / TOTAL_SUPPLY - rewardDebt[user1];
        uint256 reward2 = (_accRewardPerShare * _balance2) / TOTAL_SUPPLY - rewardDebt[user2];

        if (reward1 > 0) {
            maidCoin.transfer(user1, reward1);
            emit Claim(user1, reward1);
        }
        if (reward2 > 0) {
            maidCoin.transfer(user2, reward2);
            emit Claim(user2, reward2);
        }

        lastBalance = maidCoin.balanceOf(address(this));
    }

    function burnInitialSupply() external {
        require(!isInitialSupplyBurned, "MasterCoin : already burned");
        require(maidCoin.balanceOf(address(this)) >= MAIDCOIN_INITIAL_SUPPLY, "MasterCoin : not yet");

        _update();
        isInitialSupplyBurned = true;
        maidCoin.burn(MAIDCOIN_INITIAL_SUPPLY);
        lastBalance = maidCoin.balanceOf(address(this));
    }
}
