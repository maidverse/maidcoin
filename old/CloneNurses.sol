// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CloneNursesInterface.sol";
import "./NursePartsInterface.sol";
import "./LPTokenInterface.sol";
import "./ERC721TokenReceiver.sol";

contract CloneNurses is CloneNursesInterface {
	
	uint8 constant private DECIMALS = 18;
    uint256 constant public COIN = 10 ** uint256(DECIMALS);
    
	//TODO: need to update
	uint256 constant public COIN_PER_BLOCK = 100 * COIN;
    uint256 constant public MIN_COIN_PER_BLOCK = 1 * COIN;

	uint256 constant public HALVING_INTERVAL = 210000 * 20;
    uint256 constant public PRECISION = 1e12;
    
	address public override masters;
	NursePartsInterface public override nurseParts;
	address public override maidCoin;
	LPTokenInterface public override lpToken;
	
    uint256 immutable public startBlock;
    
	constructor() {
		masters = msg.sender;
		startBlock = block.number;
	}

	function changeMasters(address newMasters) external {
		require(msg.sender == masters);
		masters = newMasters;
	}

	function changeNurseParts(address newNurseParts) external {
		require(msg.sender == masters);
		nurseParts = NursePartsInterface(newNurseParts);
	}
    
	function changeMaidCoin(address newMaidCoin) external {
		require(msg.sender == masters);
		maidCoin = newMaidCoin;
	}
    
	function changeLPToken(address newLPToken) external {
		require(msg.sender == masters);
		lpToken = LPTokenInterface(newLPToken);
	}

    uint256 public accCoinBlock;
    uint256 public accCoin;
	uint256 public totalPower = 0;

	struct NurseClass {
		uint256 partsCount;
		uint256 destroyReturn;
		uint256 originPower;
	}
	NurseClass[] public nurseClasses;

	struct Nurse {
		
		uint256 type;
		uint256 originPower;
		uint256 supportPower;
		
        uint256 accCoinBlock;
		uint256 accCoinForOwner;
		uint256 accCoinPerSupporter;
		
        uint256 ownerRewardBlock;
        uint256 ownerRewardDept;

		bool supportable;
	}
	Nurse[] public nurses;

	struct Supporter {
		address addr;
		uint256 lpTokenAmount;
		uint256 rewardBlock;
		uint256 rewardDebt;
	}
    mapping(uint256 => Supporter[]) public supporters;
    mapping(uint256 => mapping(address => uint256)) public addrToSupporter;

	mapping(uint256 => address) public idToOwner;
	mapping(address => uint256[]) public ownerToIds;
	mapping(uint256 => uint256) internal idToOwnerIndex;
	mapping(uint256 => address) private idToApproved;
	mapping(address => mapping(address => bool)) private ownerToOperators;

    constructor() {
        genesisBlock = block.number;
    }

    function createNurseClass(uint256 partsCount, uint256 destroyReturn, uint256 originPower) external override returns (uint256) {
        uint256 nurseType = nurseClasses.length;
		nurseClasses.push(NurseClass({
			partsCount: partsCount,
			destroyReturn: destroyReturn
			originPower: originPower
		}));
		return nurseType;
    }
    
    function balanceOf(address owner) public override view returns (uint256) {
		return ownerToIds[owner].length;
    }

    function ownerOf(uint256 id) public override view returns (address) {
        return idToOwner[id];
    }
    
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public override {
        transferFrom(from, to, id);
        uint32 size;
		assembly { size := extcodesize(to) }
		if (size > 0) {
			require(ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, data) == 0x150b7a02);
		}
    }
    
    function safeTransferFrom(address from, address to, uint256 id) external override {
        safeTransferFrom(from, to, id, "");
    }
    
    function transferFrom(address from, address to, uint256 id) public override {

        address owner = ownerOf(id);

        require(
			msg.sender == owner ||
			msg.sender == getApproved(id) ||
			isApprovedForAll(ownerOf(id), msg.sender) == true
		);
        
		require(from == owner && to != owner);
		
		delete idToApproved[id];
		emit Approval(from, address(0), id);
		
		uint256 index = idToOwnerIndex[id];
		uint256 lastIndex = balanceOf(from) - 1;
		
		uint256 lastId = ownerToIds[from][lastIndex];
		ownerToIds[from][index] = lastId;
		
		delete ownerToIds[from][lastIndex];

        uint256[] storage ids = ownerToIds[from];
		ids.length -= 1;
		
		idToOwnerIndex[lastId] = index;
		idToOwner[id] = to;

        ownerToIds[to].push(id);
		idToOwnerIndex[id] = ownerToIds[to].length - 1;
		
		emit Transfer(from, to, id);
    }
    
    function approve(address approved, uint256 id) external override {
		address owner = ownerOf(id);
		require(msg.sender == owner && approved != owner);
		idToApproved[id] = approved;
		emit Approval(owner, approved, id);
    }
    
    function setApprovalForAll(address operator, bool approved) external override {
		require(operator != msg.sender);
		if (approved == true) {
			ownerToOperators[msg.sender][operator] = true;
		} else {
			delete ownerToOperators[msg.sender][operator];
		}
		emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function getApproved(uint256 id) public override view returns (address) {
        return idToApproved[id];
    }
    
    function isApprovedForAll(address owner, address operator) public override view returns (bool) {
        return ownerToOperators[owner][operator] == true;
    }
    
    function assemble(uint256 nurseType, bool supportable) external override {
        nurseParts.burn(msg.sender, nurseType, nurseTypes[nurseType].partsCount);

		NurseClass memory nurseClass = nurseClasses[nurseType];
		
		uint256 id = nurses.length;
        uint256 _accCoin = update();

		nurses.push(Nurse({
			type: nurseType,
			originPower: nurseClass.originPower,
			supportPower: 0,
			accCoinForOwner: _accCoin * nurseClass.originPower / PRECISION,
			accCoinForSupporter: 0,
			supportable: supportable
		}));

		supporters[id].push(Supporter({
			addr: address(0),
			lpTokenAmount: 0,
			rewardBlock: 0,
			rewardDebt: 0
		}));

		totalPower += nurseClass.originPower;

		idToOwner[id] = msg.sender;

        ownerToIds[msg.sender].push(id);
		idToOwnerIndex[id] = ownerToIds[msg.sender].length - 1;
		
		emit Transfer(address(0), msg.sender, id);
    }
	
    function changeSupportable(uint256 id, bool supportable) external override {
		require(msg.sender == ownerOf(id));
		nurses[id].supportable = supportable;
	}

	function updateAccCoin(Nurse storage nurse) internal {

        uint256 _accCoin = update();

		uint256 power = nurse.originPower + nurse.supportPower;
        uint256 reward = _accCoin * power / PRECISION - (nurse.accCoinForOwner + nurse.accCoinForSupporter);
        maidCoin.mint(address(this), reward);
		
		uint256 accCoin = _accCoin * power / PRECISION;
		nurse.accCoinForOwner += accCoin * nurse.originPower / power;
		nurse.accCoinPerSupporter += accCoin * nurse.supportPower / power;
        nurse.lastRewardBlock = block.number;
	}

	function moveSupporters(uint256 from, uint256 to, uint256 number) public override {

		require(msg.sender == ownerOf(from) && from != to);

		Nurse storage fromNurse = nurses[from];
		Nurse storage toNurse = nurses[to];
		
		Supporter[] storage fromSup = supporters[from];
		Supporter[] storage toSup = supporters[to];

		mapping(uint256 => uint256) storage fromAddrToSup = addrToSupporter[from];
		mapping(uint256 => uint256) storage toAddrToSup = addrToSupporter[to];

		uint256 supportPower = 0;

		require(fromSup.length <= number);
		for (uint256 i = number - 1; i > 0; i -= 1) {
			Supporter memory supporter = fromSup[i];
			delete fromAddrToSup[supporter.addr];
			toAddrToSup[supporter.addr] = toSub.length;
			toSup.push(supporter);
			supportPower += supporter.lpTokenAmount;
		}
		fromSup.length -= number;

		from.supportPower -= supportPower;
		to.supportPower += supportPower;
		
		updateAccCoin(from);
		updateAccCoin(to);
	}
    
    function destroy(uint256 id, uint256 supportersTo) external override {
		
		require(msg.sender == ownerOf(id) && supportersTo != id);
		
		delete idToApproved[id];
		emit Approval(msg.sender, address(0), id);
		
		uint256 index = idToOwnerIndex[id];
		uint256 lastIndex = balanceOf(msg.sender) - 1;
		
		uint256 lastId = ownerToIds[msg.sender][lastIndex];
		ownerToIds[msg.sender][index] = lastId;
		
		delete ownerToIds[msg.sender][lastIndex];

        uint256[] storage ids = ownerToIds[msg.sender];
		ids.length -= 1;
		
		idToOwnerIndex[lastId] = index;
		idToOwner[id] = address(0);

		Nurse memory nurse = nurses[id];

		totalPower -= nurse.originPower;
		maidCoin.mint(msg.sender, nurseClasses[nurse.type].destroyReturn);

		emit Transfer(msg.sender, address(0), id);

		// need to move supporters to another nurse
		moveSupporters(id, supportersTo, supporters[id].length);
    }

	function coinAt(uint256 blockNumber) public view override returns (uint256 coinAmount) {
        uint256 era = (blockNumber - startBlock) / HALVING_INTERVAL;
        coinAmount = COIN_PER_BLOCK / (2 ** era);
		if (coinAmount < MIN_COIN_PER_BLOCK) {
			coinAmount = MIN_COIN_PER_BLOCK;
		}
    }

    function calculateAccCoin() internal view returns (uint256) {
        uint256 _accCoinBlock = accCoinBlock;
        uint256 coin = 0;
        uint256 era1 = (_accCoinBlock - genesisEthBlock) / HALVING_INTERVAL;
        uint256 era2 = (block.number - genesisEthBlock) / HALVING_INTERVAL;

        if (era1 == era2) {
            coin = (block.number - _accCoinBlock) * coinAt(block.number);
        } else {
            uint256 boundary = (era1 + 1) * HALVING_INTERVAL + genesisEthBlock;
            coin = (boundary - _accCoinBlock) * coinAt(_accCoinBlock);
            uint256 span = era2 - era1;
            for (uint256 i = 1; i < span; i += 1) {
                boundary = (era1 + 1 + i) * HALVING_INTERVAL + genesisEthBlock;
                coin += HALVING_INTERVAL * coinAt(_accCoinBlock + HALVING_INTERVAL * i);
            }
            coin += (block.number - boundary) * coinAt(block.number);
        }

        return accCoin + coin * PRECISION / totalPower;
    }

    function support(uint256 id, uint256 lpTokenAmount) external override {

		uint256 supporterId = addrToSupporter[id][msg.sender];
		if (supporterId == 0) { // new supporter

			Supporter[] sups = supporters[id];
			supporterId = sups.length;

			sups.push(Supporter({
				addr: msg.sender,
				lpTokenAmount: lpTokenAmount,
				rewardBlock: block.number,
				rewardDebt: 0
			}));

			addrToSupporter[id][msg.sender] = supporterId;

			emit Support(msg.sender, id, lpTokenAmount);

			return supporterId;

		} else { // add amount
			supporters[id][supporterId].lpTokenAmount += lpTokenAmount;
		}

		Nurse storage nurse = nurses[id];
		updateAccCoin(nurse);
		
		nurse.supportPower += lpTokenAmount;
		totalPower += lpTokenAmount;

		// need approve
		lpToken.transferFrom(msg.sender, address(this), lpTokenAmount);
		
		emit Support(msg.sender, id, lpTokenAmount);
    }
    
    function desupport(uint256 id, uint256 lpTokenAmount) external override {
        
		uint256 supporterId = addrToSupporter[id][msg.sender];
		require(supporterId > 0);

		uint256 originAmount = supporters[id][supporterId].lpTokenAmount;
		supporters[id][supporterId].lpTokenAmount -= lpTokenAmount;

		Nurse storage nurse = nurses[id];
		updateAccCoin(nurse);
		
		nurse.supportPower -= lpTokenAmount;
		totalPower -= lpTokenAmount;

		lpToken.transferFrom(address(this), msg.sender, lpTokenAmount);

		emit Desupport(msg.sender, id, lpTokenAmount);

		if (originAmount == lpTokenAmount) {
			delete supporters[id][supporterId];
			addrToSupporter[id][msg.sender] = 0;
		}
    }
    
    function claimCoinOf(uint256 id) external view returns (uint256) {

        Nurse memory nurse = nurses[id];
        if (nurse.owner == address(0)) {
            return 0;
        }

		uint256 power = nurse.originPower + nurse.supportPower;
		uint256 accCoin = calculateAccCoin() * power / PRECISION;
		uint256 claimCoin = 0;

		// owner
		if (nurse.owner == msg.sender) {
			claimCoin += accCoin * nurse.originPower / power - nurse.accCoinForOwner;
		}

		// supporter
		uint256 supporterId = addrToSupporter[id][msg.sender];
		if (supporterId != 0) {
			uint256 accCoinPerSupporter = accCoin * nurse.supportPower / power - nurse.accCoinPerSupporter;
			Supporter supporter = supporters[id][supporterId];
			claimCoin += accCoinPerSupporter * supporter.lpTokenAmount / nurse.supportPower - supporter.rewardDebt;
		}

		return claimCoin;
    }
    
    function claim(uint256 id) external {
		
        Nurse storage nurse = nurses[id];
        require(nurse.owner != address(0));

		updateAccCoin(nurse);
		uint256 claimCoin = 0;

		// owner
		if (nurse.owner == msg.sender) {
			uint256 dept = (nurse.accCoinForOwner - nurse.ownerRewardDept) * (block.number - nurse.ownerRewardBlock);
			nurse.ownerRewardDept += dept;
			nurse.ownerRewardBlock = block.number;
			claimCoin += dept;
		}

		// supporter
		uint256 supporterId = addrToSupporter[id][msg.sender];
		if (supporterId != 0) {
			Supporter storage supporter = supporters[id][supporterId];
			uint256 dept = (nurse.accCoinPerSupporter * supporter.lpTokenAmount / nurse.supportPower - supporter.rewardDebt) * (block.number - supporter.rewardBlock);
			supporter.rewardDept += dept;
			supporter.rewardBlock = block.number;
			claimCoin += dept;
		}

		maidCoin.transfer(msg.sender, claimCoin);

		emit Claim(msg.sender, id, claimCoin);
    }

    function update() internal returns (uint256 _accCoin) {
        if (accCoinBlock != block.number) {
            _accCoin = calculateAccCoin();
            accCoin = _accCoin;
            accCoinBlock = block.number;
        } else {
            _accCoin = accCoin;
        }
    }
}
