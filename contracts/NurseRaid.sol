// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INurseRaid.sol";

contract NurseRaid is Ownable, INurseRaid {
    uint256 public override maidPowerToRaidReducedBlock = 100;

    IMaid public immutable override maid;
    IMaidCoin public immutable override maidCoin;
    INursePart public immutable override nursePart;
    IRNG public override rng;

    constructor(
        IMaid _maid,
        IMaidCoin _maidCoin,
        INursePart _nursePart,
        IRNG _rng
    ) {
        maid = _maid;
        maidCoin = _maidCoin;
        nursePart = _nursePart;
        rng = _rng;
    }

    function changeMaidPowerToRaidReducedBlock(uint256 value) external onlyOwner {
        maidPowerToRaidReducedBlock = value;
        emit ChangeMaidPowerToRaidReducedBlock(value);
    }

    function changeRNG(address addr) external onlyOwner {
        rng = IRNG(addr);
    }

    struct Raid {
        uint256 entranceFee;
        uint256 nursePart;
        uint256 maxRewardCount;
        uint256 duration;
        uint256 endBlock;
    }
    Raid[] public raids;

    function raidCount() external view override returns (uint256) {
        return raids.length;
    }

    struct Challenger {
        uint256 enterBlock;
        uint256 maid;
    }
    mapping(uint256 => mapping(address => Challenger)) public challengers;

    function create(
        uint256 entranceFee,
        uint256 _nursePart,
        uint256 maxRewardCount,
        uint256 duration,
        uint256 endBlock
    ) external override onlyOwner returns (uint256 id) {
        require(maxRewardCount < 255, "NurseRaid: Invalid number");
        id = raids.length;
        raids.push(
            Raid({
                entranceFee: entranceFee,
                nursePart: _nursePart,
                maxRewardCount: maxRewardCount,
                duration: duration,
                endBlock: endBlock
            })
        );
        emit Create(id, entranceFee, _nursePart, maxRewardCount, duration, endBlock);
    }

    function enterWithPermitAll(
        uint256 id,
        uint256 _maid,
        uint256 deadline,
        uint8 v1,
        bytes32 r1,
        bytes32 s1,
        uint8 v2,
        bytes32 r2,
        bytes32 s2
    ) external override {
        maidCoin.permit(msg.sender, address(this), type(uint256).max, deadline, v1, r1, s1);
        maid.permitAll(msg.sender, address(this), deadline, v2, r2, s2);
        enter(id, _maid);
    }

    function enter(uint256 id, uint256 _maid) public override {
        Raid memory raid = raids[id];
        require(block.number < raid.endBlock, "NurseRaid: Raid has ended");
        require(challengers[id][msg.sender].enterBlock == 0, "NurseRaid: Raid is in progress");
        challengers[id][msg.sender] = Challenger({enterBlock: block.number, maid: _maid});
        if (_maid != type(uint256).max) {
            maid.transferFrom(msg.sender, address(this), _maid);
        }
        maidCoin.transferFrom(msg.sender, address(this), raid.entranceFee);
        maidCoin.burn(raid.entranceFee);
        emit Enter(msg.sender, id, _maid);
    }

    function checkDone(uint256 id) public view override returns (bool) {
        Raid memory raid = raids[id];
        Challenger memory challenger = challengers[id][msg.sender];

        return _checkDone(raid, challenger);
    }

    function _checkDone(Raid memory raid, Challenger memory challenger) internal view returns (bool) {
        if (challenger.maid == type(uint256).max) {
            return block.number - challenger.enterBlock >= raid.duration;
        } else {
            return
                block.number -
                    challenger.enterBlock +
                    (maid.powerOf(challenger.maid) * maidPowerToRaidReducedBlock) /
                    100 >=
                raid.duration;
        }
    }

    function exit(uint256 id) external override {
        Challenger memory challenger = challengers[id][msg.sender];
        require(challenger.enterBlock != 0, "NurseRaid: Not participating in the raid");

        Raid memory raid = raids[id];

        if (_checkDone(raid, challenger)) {
            uint256 rewardCount = _randomReward(id, raid.maxRewardCount, msg.sender);
            nursePart.mint(msg.sender, raid.nursePart, rewardCount);
        }

        if (challenger.maid != type(uint256).max) {
            maid.transferFrom(address(this), msg.sender, challenger.maid);
        }

        delete challengers[id][msg.sender];

        emit Exit(msg.sender, id);
    }

    function _randomReward(
        uint256 _id,
        uint256 _maxRewardCount,
        address sender
    ) internal returns (uint256 rewardCount) {
        uint256 totalNumber = 2 * (2**_maxRewardCount - 1);
        uint256 randomNumber = (rng.generateRandomNumber(_id, sender) % totalNumber) + 1;

        uint256 ceil;
        uint256 i = 0;

        while (randomNumber > ceil) {
            i += 1;
            ceil = (2**(_maxRewardCount + 1)) - (2**(_maxRewardCount + 1 - i));
        }

        rewardCount = i;
    }
}
