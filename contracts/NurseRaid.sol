// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INurseRaid.sol";

contract NurseRaid is Ownable, INurseRaid {
    uint256 public constant MAX_MAIDS_PER_RAID = 5;

    uint256 public override maidPowerToRaidReducedBlock = 1;

    IMaid public immutable override maid;
    IMaidCoin public immutable override maidCoin;
    INursePart public immutable override nursePart;
    IRNG public override rng;

    constructor(
        address maidAddr,
        address maidCoinAddr,
        address nursePartAddr,
        address rngAddr
    ) {
        maid = IMaid(maidAddr);
        maidCoin = IMaidCoin(maidCoinAddr);
        nursePart = INursePart(nursePartAddr);
        rng = IRNG(rngAddr);
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

    struct Challenger {
        uint256 enterBlock;
        uint256[] maids;
    }
    mapping(uint256 => mapping(address => Challenger)) public challengers;

    function create(
        uint256 entranceFee,
        uint256 _nursePart,
        uint256 maxRewardCount,
        uint256 duration,
        uint256 endBlock
    ) external override onlyOwner returns (uint256 id) {
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
        uint256[] calldata maids,
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
        enter(id, maids);
    }

    function enter(uint256 id, uint256[] calldata maids) public override {
        Raid memory raid = raids[id];
        require(block.number < raid.endBlock);
        require(maids.length < MAX_MAIDS_PER_RAID);

        require(challengers[id][msg.sender].enterBlock == 0);
        challengers[id][msg.sender] = Challenger({enterBlock: block.number, maids: maids});

        uint256 maidsLength = maids.length;
        for (uint256 i = 0; i < maidsLength; i += 1) {
            maid.transferFrom(msg.sender, address(this), maids[i]);
        }

        maidCoin.transferFrom(msg.sender, address(this), raid.entranceFee);
        maidCoin.burn(raid.entranceFee);
        emit Enter(msg.sender, id, maids);
    }

    function checkDone(uint256 id) public view override returns (bool) {
        Raid memory raid = raids[id];
        Challenger memory challenger = challengers[id][msg.sender];

        return _checkDone(raid, challenger);
    }

    function _checkDone(Raid memory raid, Challenger memory challenger) internal view returns (bool) {
        uint256 maidsLength = challenger.maids.length;
        uint256 totalPower = 0;
        for (uint256 i = 0; i < maidsLength; i += 1) {
            totalPower += maid.powerOf(challenger.maids[i]);
        }

        if (totalPower == 0) {
            return block.number - challenger.enterBlock >= raid.duration;
        } else {
            return block.number - challenger.enterBlock + totalPower * maidPowerToRaidReducedBlock >= raid.duration;
        }
    }

    function exit(uint256 id) external override {
        Challenger memory challenger = challengers[id][msg.sender];
        require(challenger.enterBlock != 0);

        Raid memory raid = raids[id];

        if (_checkDone(raid, challenger)) {
            uint256 rewardCount = (rng.generateRandomNumber(id) % raid.maxRewardCount) + 1;
            nursePart.mint(msg.sender, raid.nursePart, rewardCount);
        }

        uint256 maidsLength = challenger.maids.length;
        for (uint256 i = 0; i < maidsLength; i += 1) {
            maid.transferFrom(address(this), msg.sender, challenger.maids[i]);
        }

        delete challengers[id][msg.sender];

        emit Exit(msg.sender, id);
    }
}
