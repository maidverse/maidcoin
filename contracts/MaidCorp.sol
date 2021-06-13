// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMaidCorp.sol";
import "./interfaces/IRatio.sol";
import "./interfaces/IMaidCoin.sol";

contract MaidCorp is Ownable, IMaidCorp {
    IRatio public override ratio;
    IMaidCoin public override maidCoin;
    IERC20 public override lpToken;

    uint256 private lastUpdateBlock;
    uint256 private _accRewardPerShare;
    uint256 private totalLPTokenAmount = 0;

    mapping(address => uint256) private lpTokenAmounts;
    mapping(address => uint256) private accRewards;

    constructor(
        address ratioAddr,
        address maidCoinAddr,
        address lpTokenAddr
    ) {
        ratio = IRatio(ratioAddr);
        maidCoin = IMaidCoin(maidCoinAddr);
        lpToken = IERC20(lpTokenAddr);
    }

    function changeLPToken(address addr) external onlyOwner {
        lpToken = IERC20(addr);
    }

    function deposit(uint256 lpTokenAmount) external override {
        claim();
        lpTokenAmounts[msg.sender] += lpTokenAmount;
        totalLPTokenAmount += lpTokenAmount;

        emit Deposit(msg.sender, lpTokenAmount);
    }

    function withdraw(uint256 lpTokenAmount) external override {
        claim();
        lpTokenAmounts[msg.sender] -= lpTokenAmount;
        totalLPTokenAmount -= lpTokenAmount;

        emit Withdraw(msg.sender, lpTokenAmount);
    }

    function accRewardPerShare() internal view returns (uint256 result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result +=
                (maidCoin.maidCorpAccReward() * 1e18) /
                totalLPTokenAmount;
        }
    }

    function _update() internal returns (uint256 result) {
        result = _accRewardPerShare;
        if (lastUpdateBlock != block.number) {
            result += (maidCoin.mintForMaidCorp() * 1e18) / totalLPTokenAmount;
            _accRewardPerShare = result;
            lastUpdateBlock = block.number;
        }
    }

    function claimAmount() public view override returns (uint256) {
        return
            (accRewardPerShare() * lpTokenAmounts[msg.sender]) /
            1e18 -
            accRewards[msg.sender];
    }

    function claim() public override {
        uint256 reward = (_update() * lpTokenAmounts[msg.sender]) /
            1e18 -
            accRewards[msg.sender];
        maidCoin.transfer(msg.sender, reward);
        accRewards[msg.sender] += reward;
    }
}
