// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INurseRaid.sol";
import "./interfaces/IRatio.sol";
import "./interfaces/IMaid.sol";
import "./interfaces/IMaidCoin.sol";
import "./interfaces/INursePart.sol";
import "./interfaces/IRNG.sol";

contract NurseRaid is Ownable, INurseRaid {
    uint256 public constant MAX_MAIDS_PER_RAID = 5;

    IRatio public override ratio;
    IMaid public override maid;
    IMaidCoin public override maidCoin;
    INursePart public override nursePart;
    IRNG public override rng;

    constructor(
        address ratioAddr,
        address maidAddr,
        address maidCoinAddr,
        address nursePartAddr,
        address rngAddr
    ) {
        ratio = IRatio(ratioAddr);
        maid = IMaid(maidAddr);
        maidCoin = IMaidCoin(maidCoinAddr);
        nursePart = INursePart(nursePartAddr);
        rng = IRNG(rngAddr);
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
        emit Create(
            id,
            entranceFee,
            _nursePart,
            maxRewardCount,
            duration,
            endBlock
        );
    }

    function enter(uint256 id, uint256[] calldata maids) external override {
        Raid memory raid = raids[id];
        require(block.number < raid.endBlock);
        require(maids.length < MAX_MAIDS_PER_RAID);

        require(challengers[id][msg.sender].enterBlock == 0);
        challengers[id][msg.sender] = Challenger({
            enterBlock: block.number,
            maids: maids
        });

        uint256 maidsLength = maids.length;
        for (uint256 i = 0; i < maidsLength; i += 1) {
            maid.transferFrom(msg.sender, address(this), maids[i]);
        }

        maidCoin.burn(msg.sender, raid.entranceFee);
        emit Enter(msg.sender, id, maids);
    }

    function checkDone(uint256 id) public view override returns (bool) {
        Raid memory raid = raids[id];
        Challenger memory challenger = challengers[id][msg.sender];

        uint256 maidsLength = challenger.maids.length;
        uint256 totalPower = 0;
        for (uint256 i = 0; i < maidsLength; i += 1) {
            totalPower += maid.powerOf(challenger.maids[i]);
        }

        return
            block.number -
                challenger.enterBlock +
                totalPower *
                ratio.maidPowerToRaidReducedBlock() >=
            raid.duration;
    }

    function exit(uint256 id) external override {
        Challenger memory challenger = challengers[id][msg.sender];
        require(challenger.enterBlock != 0);

        Raid memory raid = raids[id];

        // done
        if (checkDone(id) == true) {
            uint256 rewardCount = (rng.generateRandomNumber(id) %
                raid.maxRewardCount) + 1;
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
