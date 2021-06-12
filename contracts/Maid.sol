// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMaid.sol";
import "./interfaces/IRatio.sol";
import "./interfaces/IMaidCoin.sol";

contract Maid is Ownable, ERC721("Maid", "MAID"), IMaid {
    
	IRatio override public ratio;
	IMaidCoin override public maidCoin;
	IERC20 override public lpToken;
	
    constructor(address ratioAddr, address maidCoinAddr, address lpTokenAddr) {
		ratio = IRatio(ratioAddr);
		maidCoin = IMaidCoin(maidCoinAddr);
		lpToken = IERC20(lpTokenAddr);
	}
	
    function changeLPToken(address addr) onlyOwner external { lpToken = IERC20(addr); }
	
	struct MaidInfo {
		uint originPower;
        uint initialPrice;
		uint supportedLPTokenAmount;
	}
	MaidInfo[] public maids;
	
    function mint(uint power, uint initialPrice) onlyOwner external returns (uint id) {
        id = maids.length;
		maids.push(MaidInfo({
			originPower: power,
			initialPrice: initialPrice,
			supportedLPTokenAmount: 0
		}));
		_mint(address(this), id);
    }
    
    function firstBuy(uint id) override external {
        require(ownerOf(id) == address(this));
        _transfer(address(this), msg.sender, id);
        maidCoin.burn(msg.sender, maids[id].initialPrice);
    }
    
    function powerOf(uint id) override external view returns (uint) {
		MaidInfo memory maid = maids[id];
		return maid.originPower + maid.supportedLPTokenAmount * ratio.lpTokenToMaidPower() / ratio.precision();
    }
    
    function support(uint id, uint lpTokenAmount) override external {
		require(ownerOf(id) == msg.sender);
		maids[id].supportedLPTokenAmount += lpTokenAmount;

		// need approve
		lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);
    }
    
    function desupport(uint id, uint lpTokenAmount) override external {
		require(ownerOf(id) == msg.sender);
		maids[id].supportedLPTokenAmount -= lpTokenAmount;
		lpToken.transfer(msg.sender, lpTokenAmount);
    }
}
