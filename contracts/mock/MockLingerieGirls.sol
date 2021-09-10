// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "../libraries/ERC721Enumerable.sol";
import "../uniswapv2/interfaces/IUniswapV2Pair.sol";
import "../interfaces/IERC1271.sol";
import "../libraries/Signature.sol";
import "../libraries/MasterChefModule.sol";

contract MockLingerieGirls is ERC721("Mock", "MOCK"), ERC721Enumerable, MasterChefModule {
    struct LingerieGirlInfo {
        uint256 originPower;
        uint256 supportedLPTokenAmount;
        uint256 sushiRewardDebt;
    }

    uint256 public lpTokenToLingerieGirlPower = 1;
    LingerieGirlInfo[] public lingerieGirls;

    constructor(
        IUniswapV2Pair _lpToken,
        IERC20 _sushi,
        uint256[5] memory powers
    ) MasterChefModule(_lpToken, _sushi) {
        for (uint256 i = 0; i < 5; i += 1) {
            lingerieGirls.push(
                LingerieGirlInfo({originPower: powers[i], supportedLPTokenAmount: 0, sushiRewardDebt: 0})
            );
            _mint(msg.sender, i);
        }
    }

    function mint(uint256 power) external returns (uint256 id) {
        id = lingerieGirls.length;
        lingerieGirls.push(LingerieGirlInfo({originPower: power, supportedLPTokenAmount: 0, sushiRewardDebt: 0}));
        _mint(msg.sender, id);
    }

    function mintBatch(uint256[] calldata powers, uint256 amounts) external {
        require(powers.length == amounts, "LingerieGirls: Invalid parameters");
        uint256 from = lingerieGirls.length;
        for (uint256 i = 0; i < amounts; i += 1) {
            lingerieGirls.push(
                LingerieGirlInfo({originPower: powers[i], supportedLPTokenAmount: 0, sushiRewardDebt: 0})
            );
            _mint(msg.sender, (i + from));
        }
    }

    function powerOf(uint256 id) external view returns (uint256) {
        LingerieGirlInfo storage lingerieGirl = lingerieGirls[id];
        return lingerieGirl.originPower + (lingerieGirl.supportedLPTokenAmount * lpTokenToLingerieGirlPower) / 1e18;
    }

    function support(uint256 id, uint256 lpTokenAmount) public {
        require(ownerOf(id) == msg.sender, "LingerieGirls: Forbidden");
        require(lpTokenAmount > 0, "LingerieGirls: Invalid lpTokenAmount");
        uint256 _supportedLPTokenAmount = lingerieGirls[id].supportedLPTokenAmount;

        lingerieGirls[id].supportedLPTokenAmount = _supportedLPTokenAmount + lpTokenAmount;
        lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);

        uint256 _pid = masterChefPid;
        if (_pid > 0) {
            lingerieGirls[id].sushiRewardDebt = _depositModule(
                _pid,
                lpTokenAmount,
                _supportedLPTokenAmount,
                lingerieGirls[id].sushiRewardDebt
            );
        }
    }

    function desupport(uint256 id, uint256 lpTokenAmount) external {
        require(ownerOf(id) == msg.sender, "LingerieGirls: Forbidden");
        require(lpTokenAmount > 0, "LingerieGirls: Invalid lpTokenAmount");
        uint256 _supportedLPTokenAmount = lingerieGirls[id].supportedLPTokenAmount;

        lingerieGirls[id].supportedLPTokenAmount = _supportedLPTokenAmount - lpTokenAmount;

        uint256 _pid = masterChefPid;
        if (_pid > 0) {
            lingerieGirls[id].sushiRewardDebt = _withdrawModule(
                _pid,
                lpTokenAmount,
                _supportedLPTokenAmount,
                lingerieGirls[id].sushiRewardDebt
            );
        }

        lpToken.transfer(msg.sender, lpTokenAmount);
    }

    function claimSushiReward(uint256 id) public {
        require(ownerOf(id) == msg.sender, "LingerieGirls: Forbidden");
        lingerieGirls[id].sushiRewardDebt = _claimSushiReward(
            lingerieGirls[id].supportedLPTokenAmount,
            lingerieGirls[id].sushiRewardDebt
        );
    }

    function pendingSushiReward(uint256 id) external view returns (uint256) {
        return _pendingSushiReward(lingerieGirls[id].supportedLPTokenAmount, lingerieGirls[id].sushiRewardDebt);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721 ,ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721 ,ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
