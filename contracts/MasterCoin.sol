// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMasterCoin.sol";
import "./interfaces/IMaidCoin.sol";

contract MasterCoin is ERC20("MasterCoin", "$MASTER"), IMasterCoin {
    uint256 public constant INITIAL_SUPPLY = 100 * 1e18;

    IMaidCoin public override maidCoin;

    uint256 private lastRewardAddedBlock;
    uint256 private accRewardPerShare;

    mapping(address => uint256) private accRewards;

    constructor(address maidCoinAddr) {
        _mint(_msgSender(), INITIAL_SUPPLY);
        maidCoin = IMaidCoin(maidCoinAddr);
    }

    function addReward(uint256 reward) public override {
        if (lastRewardAddedBlock != block.number) {
            accRewardPerShare += reward / 100;
            lastRewardAddedBlock = block.number;
        }
    }

    function transfer(address to, uint256 amount)
        public
        override(ERC20, IERC20)
        returns (bool)
    {
        claim(_msgSender());
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        claim(from);
        return super.transferFrom(from, to, amount);
    }

    function claimAmount(address master)
        public
        view
        override
        returns (uint256)
    {
        return
            (accRewardPerShare * balanceOf(master)) / 1e18 - accRewards[master];
    }

    function claim(address master) public override {
        uint256 reward = claimAmount(master);
        maidCoin.transfer(master, reward);
        accRewards[master] += reward;
    }
}
