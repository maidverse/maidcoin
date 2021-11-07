// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/MasterChefModule.sol";
import "./interfaces/IMaidData.sol";

contract MaidData is Ownable, MasterChefModule, IMaidData {
    struct MaidInfo {
        uint256 originPower;
        uint256 supportedLPTokenAmount;
        uint256 sushiRewardDebt;
    }

    mapping (uint256 => MaidInfo) public override maidInfo;
    IERC721 public immutable override maids;

    constructor(
        IUniswapV2Pair _lpToken,
        IERC20 _sushi,
        IERC721 _maids
    ) MasterChefModule(_lpToken, _sushi) {
        maids = _maids;
    }

    function setPowers(uint256[] calldata maidIds, uint256[] calldata powers) external onlyOwner {
        for (uint256 i = 0; i < maidIds.length; i++) {
            MaidInfo storage mInfo = maidInfo[maidIds[i]];
            require(mInfo.originPower == 0, "MaidData: Invalid maidId");
            mInfo.originPower = powers[i];
            emit SetPower(maidIds[i], powers[i]);
        }
    }

    function powerAndLP(uint256 id) external view override returns (uint256, uint256) {
        MaidInfo storage maid = maidInfo[id];
        return (maid.originPower, maid.supportedLPTokenAmount);
    }

    function support(uint256 id, uint256 lpTokenAmount) public override {
        require(maids.ownerOf(id) == msg.sender, "Maids: Forbidden");
        require(lpTokenAmount > 0, "Maids: Invalid lpTokenAmount");
        uint256 _supportedLPTokenAmount = maidInfo[id].supportedLPTokenAmount;

        maidInfo[id].supportedLPTokenAmount = _supportedLPTokenAmount + lpTokenAmount;
        lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);

        uint256 _pid = masterChefPid;
        if (_pid > 0) {
            maidInfo[id].sushiRewardDebt = _depositModule(
                _pid,
                lpTokenAmount,
                _supportedLPTokenAmount,
                maidInfo[id].sushiRewardDebt
            );
        }

        emit Support(id, lpTokenAmount);
    }

    function supportWithPermit(
        uint256 id,
        uint256 lpTokenAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        lpToken.permit(msg.sender, address(this), lpTokenAmount, deadline, v, r, s);
        support(id, lpTokenAmount);
    }

    function desupport(uint256 id, uint256 lpTokenAmount) external override {
        require(maids.ownerOf(id) == msg.sender, "Maids: Forbidden");
        require(lpTokenAmount > 0, "Maids: Invalid lpTokenAmount");
        uint256 _supportedLPTokenAmount = maidInfo[id].supportedLPTokenAmount;

        maidInfo[id].supportedLPTokenAmount = _supportedLPTokenAmount - lpTokenAmount;

        uint256 _pid = masterChefPid;
        if (_pid > 0) {
            maidInfo[id].sushiRewardDebt = _withdrawModule(
                _pid,
                lpTokenAmount,
                _supportedLPTokenAmount,
                maidInfo[id].sushiRewardDebt
            );
        }

        lpToken.transfer(msg.sender, lpTokenAmount);
        emit Desupport(id, lpTokenAmount);
    }

    function claimSushiReward(uint256 id) public override {
        require(maids.ownerOf(id) == msg.sender, "Maids: Forbidden");
        maidInfo[id].sushiRewardDebt = _claimSushiReward(maidInfo[id].supportedLPTokenAmount, maidInfo[id].sushiRewardDebt);
    }

    function pendingSushiReward(uint256 id) external view override returns (uint256) {
        return _pendingSushiReward(maidInfo[id].supportedLPTokenAmount, maidInfo[id].sushiRewardDebt);
    }
}
