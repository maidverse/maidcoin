// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMaidCoin.sol";

contract MaidCoin is Ownable, ERC20("MaidCoin", "$MAID"), IMaidCoin {
    uint256 public constant INITIAL_SUPPLY = 30000 * 1e18;
    uint256 public constant REWARD_PER_BLOCK = 100 * 1e18;
    uint256 public constant HALVING_INTERVAL = 4000000;

    IRatio public override ratio;
    IMasterCoin public override masterCoin;

    address public override maidCorp = _msgSender();
    address public override cloneNurse = _msgSender();
    address public override maid = _msgSender();
    address public override nurseRaid = _msgSender();

    uint256 private startBlock;
    uint256 private lastUpdateBlock;
    uint256 private _accRewardPerShare;

    uint256 private _maidCorpAccReward;
    uint256 private _nurseRaidAccReward;

    constructor(address ratioAddr) {
        ratio = IRatio(ratioAddr);
        startBlock = block.number;
        _mint(_msgSender(), INITIAL_SUPPLY);
    }

    function initialSupply() external pure override returns (uint256) {
        return INITIAL_SUPPLY;
    }

    function changeMasterCoin(address addr) external onlyOwner {
        masterCoin = IMasterCoin(addr);
    }

    function changeMaidCorp(address addr) external onlyOwner {
        maidCorp = addr;
    }

    function changeCloneNurse(address addr) external onlyOwner {
        cloneNurse = addr;
    }

    function changeMaid(address addr) external onlyOwner {
        maid = addr;
    }

    function changeNurseRaid(address addr) external onlyOwner {
        nurseRaid = addr;
    }

    function allowance(address user, address spender)
        public
        view
        override(ERC20, IERC20)
        returns (uint256)
    {
        if (spender == maid || spender == nurseRaid) {
            return balanceOf(user);
        }
        return super.allowance(user, spender);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool) {
        uint256 _allowance = super.allowance(from, msg.sender);
        if (
            _allowance != type(uint256).max &&
            msg.sender != maid &&
            msg.sender != nurseRaid
        ) {
            _approve(from, _msgSender(), _allowance - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _accRewardPerBlockAt(uint256 blockNumber)
        internal
        view
        returns (uint256)
    {
        uint256 era = (blockNumber - startBlock) / HALVING_INTERVAL;
        return REWARD_PER_BLOCK / era;
    }

    function accRewardPerShare() internal view returns (uint256 result) {
        result = _accRewardPerShare;

        if (lastUpdateBlock != block.number) {
            uint256 _lastUpdateBlock = lastUpdateBlock;
            uint256 era1 = (_lastUpdateBlock - startBlock) / HALVING_INTERVAL;
            uint256 era2 = (block.number - startBlock) / HALVING_INTERVAL;

            if (era1 == era2) {
                result +=
                    (block.number - _lastUpdateBlock) *
                    _accRewardPerBlockAt(block.number);
            } else {
                uint256 boundary = (era1 + 1) * HALVING_INTERVAL + startBlock;
                result +=
                    (boundary - _lastUpdateBlock) *
                    _accRewardPerBlockAt(_lastUpdateBlock);
                uint256 span = era2 - era1;
                for (uint256 i = 1; i < span; i += 1) {
                    boundary = (era1 + 1 + i) * HALVING_INTERVAL + startBlock;
                    result +=
                        HALVING_INTERVAL *
                        _accRewardPerBlockAt(
                            _lastUpdateBlock + HALVING_INTERVAL * i
                        );
                }
                result +=
                    (block.number - boundary) *
                    _accRewardPerBlockAt(block.number);
            }
        }
    }

    function _update() internal returns (uint256 result) {
        result = accRewardPerShare();
        if (lastUpdateBlock != block.number) {
            _accRewardPerShare = result;
            lastUpdateBlock = block.number;
        }
    }

    function mint(address to, uint256 amount)
        internal
        returns (uint256 toAmount)
    {
        uint256 masterReward = amount / 10; // 10% to masters.
        toAmount = amount - masterReward;

        _mint(address(masterCoin), masterReward);
        masterCoin.addReward(masterReward);

        _mint(to, toAmount);

        emit Mint(to, toAmount);
    }

    function maidCorpAccReward() external view override returns (uint256) {
        uint256 share = accRewardPerShare();
        uint256 reward = (share * ratio.precision()) /
            (ratio.precision() + ratio.corpRewardToNurseReward()) -
            _maidCorpAccReward;
        return _maidCorpAccReward + reward - reward / 10; // 10% to masters.
    }

    function mintForMaidCorp() external override returns (uint256) {
        require(msg.sender == maidCorp);
        uint256 share = _update();

        uint256 accReward = _maidCorpAccReward;
        uint256 reward = (share * ratio.precision()) /
            (ratio.precision() + ratio.corpRewardToNurseReward()) -
            accReward;

        if (reward > 0) {
            accReward += mint(maidCorp, reward);
            _maidCorpAccReward = accReward;
        }

        return accReward;
    }

    function nurseRaidAccReward() external view override returns (uint256) {
        uint256 share = accRewardPerShare();
        uint256 reward = ((share * ratio.precision()) /
            (ratio.precision() + ratio.corpRewardToNurseReward())) *
            ratio.corpRewardToNurseReward() -
            _nurseRaidAccReward;
        return _nurseRaidAccReward + reward - reward / 10; // 10% to masters.
    }

    function mintForCloneNurse() external override returns (uint256) {
        require(msg.sender == nurseRaid);
        uint256 share = _update();

        uint256 accReward = _nurseRaidAccReward;
        uint256 reward = ((share * ratio.precision()) /
            (ratio.precision() + ratio.corpRewardToNurseReward())) *
            ratio.corpRewardToNurseReward() -
            accReward;

        if (reward > 0) {
            accReward += mint(nurseRaid, reward);
            _nurseRaidAccReward = accReward;
        }

        return accReward;
    }

    function mintForCloneNurseDestruction(address to, uint256 amount)
        external
        override
    {
        require(msg.sender == cloneNurse);
        mint(to, amount);
    }

    function burn(address from, uint256 amount) external override {
        require(msg.sender == maid || msg.sender == nurseRaid);
        _burn(from, amount);
        emit Burn(from, amount);
    }
}
