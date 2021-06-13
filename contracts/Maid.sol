// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMaid.sol";
import "./interfaces/IRatio.sol";
import "./interfaces/IMaidCoin.sol";

contract Maid is Ownable, ERC721("Maid", "MAID"), IMaid {
    IRatio public override ratio;
    IMaidCoin public override maidCoin;
    IERC20 public override lpToken;

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

    struct MaidInfo {
        uint256 originPower;
        uint256 initialPrice;
        uint256 supportedLPTokenAmount;
    }
    MaidInfo[] public maids;

    function mint(uint256 power, uint256 initialPrice)
        external
        onlyOwner
        returns (uint256 id)
    {
        id = maids.length;
        maids.push(
            MaidInfo({
                originPower: power,
                initialPrice: initialPrice,
                supportedLPTokenAmount: 0
            })
        );
        _mint(address(this), id);
    }

    function firstBuy(uint256 id) external override {
        require(ownerOf(id) == address(this));
        _transfer(address(this), msg.sender, id);
        maidCoin.burn(msg.sender, maids[id].initialPrice);
    }

    function powerOf(uint256 id) external view override returns (uint256) {
        MaidInfo memory maid = maids[id];
        return
            maid.originPower +
            (maid.supportedLPTokenAmount * ratio.lpTokenToMaidPower()) /
            ratio.precision();
    }

    function support(uint256 id, uint256 lpTokenAmount) external override {
        require(ownerOf(id) == msg.sender);
        maids[id].supportedLPTokenAmount += lpTokenAmount;

        // need approve
        lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);
    }

    function desupport(uint256 id, uint256 lpTokenAmount) external override {
        require(ownerOf(id) == msg.sender);
        maids[id].supportedLPTokenAmount -= lpTokenAmount;
        lpToken.transfer(msg.sender, lpTokenAmount);
    }
}
