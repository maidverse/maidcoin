pragma solidity ^0.8.5;

// SPDX-License-Identifier: MIT
/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

// SPDX-License-Identifier: MIT
/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

// SPDX-License-Identifier: MIT
/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// SPDX-License-Identifier: MIT
/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(account) }
        return size > 0;
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success, ) = recipient.call{ value: amount }("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain`call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason, it is bubbled up by this
     * function (like regular Solidity function calls).
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
      return functionCall(target, data, "Address: low-level call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
     * `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    /**
     * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
     * with `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value, string memory errorMessage) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.call{ value: value }(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(address target, bytes memory data, string memory errorMessage) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.staticcall(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    function _verifyCallResult(bool success, bytes memory returndata, string memory errorMessage) private pure returns(bytes memory) {
        if (success) {
            return returndata;
        } else {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

// SPDX-License-Identifier: MIT
/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    /**
     * @dev Deprecated. This function has issues similar to the ones found in
     * {IERC20-approve}, and its usage is discouraged.
     *
     * Whenever possible, use {safeIncreaseAllowance} and
     * {safeDecreaseAllowance} instead.
     */
    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
        // solhint-disable-next-line max-line-length
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender) + value;
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    function safeDecreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        unchecked {
            uint256 oldAllowance = token.allowance(address(this), spender);
            require(oldAllowance >= value, "SafeERC20: decreased allowance below zero");
            uint256 newAllowance = oldAllowance - value;
            _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

// SPDX-License-Identifier: MIT
interface IUniswapV2ERC20 {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external pure returns (string memory);
    function symbol() external pure returns (string memory);
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
}

// SPDX-License-Identifier: MIT
interface IMaidCoin {
    
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function name() external pure returns (string memory);
    function symbol() external pure returns (string memory);
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint256);
    function INITIAL_SUPPLY() external pure returns (uint256);

    function balanceOf(address owner) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint256);

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}

// SPDX-License-Identifier: MIT
interface IRewardCalculator {
    function rewardPerBlock() external view returns (uint256);
}

// SPDX-License-Identifier: MIT
interface ISupportable {

    event SupportTo(address indexed supporter, uint256 indexed to);
    event ChangeSupportingRoute(uint256 indexed from, uint256 indexed to);
    event ChangeSupportedPower(uint256 indexed id, int256 power);
    event TransferSupportingRewards(address indexed supporter, uint256 indexed id, uint256 amounts);

    function supportingRoute(uint256 id) external view returns (uint256);
    function supportingTo(address supporter) external view returns (uint256);
    function supportedPower(uint256 id) external view returns (uint256);
    function totalRewardsFromSupporters(uint256 id) external view returns (uint256);

    function setSupportingTo(
        address supporter,
        uint256 to,
        uint256 amounts
    ) external;

    function checkSupportingRoute(address supporter) external returns (address, uint256);

    function changeSupportedPower(address supporter, int256 power) external;

    function shareRewards(uint256 pending, address supporter, uint8 supportingRatio)
        external
        returns (address nurseOwner, uint256 amountToNurseOwner);
}

// SPDX-License-Identifier: MIT
interface ITheMaster {

    event ChangeRewardCalculator(address addr);

    event Add(
        uint256 indexed pid,
        address addr,
        bool indexed delegate,
        bool indexed mintable,
        address supportable,
        uint8 supportingRatio,
        uint256 allocPoint
    );

    event Set(uint256 indexed pid, uint256 allocPoint);
    event Deposit(uint256 indexed userId, uint256 indexed pid, uint256 amount);
    event Withdraw(uint256 indexed userId, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    event Support(address indexed supporter, uint256 indexed pid, uint256 amount);
    event Desupport(address indexed supporter, uint256 indexed pid, uint256 amount);
    event EmergencyDesupport(address indexed user, uint256 indexed pid, uint256 amount);

    event SetIsSupporterPool(uint256 indexed pid, bool indexed status);

    function initialRewardPerBlock() external view returns (uint256);
    function decreasingInterval() external view returns (uint256);
    function startBlock() external view returns (uint256);
    function maidCoin() external view returns (IMaidCoin);
    function rewardCalculator() external view returns (IRewardCalculator);

    function poolInfo(uint256 pid)
        external
        view
        returns (
            address addr,
            bool delegate,
            ISupportable supportable,
            uint8 supportingRatio,
            uint256 allocPoint,
            uint256 lastRewardBlock,
            uint256 accRewardPerShare,
            uint256 supply
        );

    function poolCount() external view returns (uint256);
    function userInfo(uint256 pid, uint256 user) external view returns (uint256 amount, uint256 rewardDebt);
    function mintableByAddr(address addr) external view returns (bool);
    function totalAllocPoint() external view returns (uint256);
    function pendingReward(uint256 pid, uint256 userId) external view returns (uint256);
    function rewardPerBlock() external view returns (uint256);

    function changeRewardCalculator(address addr) external;

    function add(
        address addr,
        bool delegate,
        bool mintable,
        address supportable,
        uint8 supportingRatio,
        uint256 allocPoint
    ) external;

    function set(
        uint256 pid,
        uint256 allocPoint
    ) external;

    function deposit(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) external;

    function depositWithPermit(
        uint256 pid,
        uint256 amount,
        uint256 userId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function depositWithPermitMax(
        uint256 pid,
        uint256 amount,
        uint256 userId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function withdraw(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) external;

    function emergencyWithdraw(uint256 pid) external;

    function support(
        uint256 pid,
        uint256 amount,
        uint256 supportTo
    ) external;

    function supportWithPermit(
        uint256 pid,
        uint256 amount,
        uint256 supportTo,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function supportWithPermitMax(
        uint256 pid,
        uint256 amount,
        uint256 supportTo,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function desupport(uint256 pid, uint256 amount) external;

    function emergencyDesupport(uint256 pid) external;

    function mint(address to, uint256 amount) external;
}

// SPDX-License-Identifier: MIT
contract TheMaster is Ownable, ITheMaster {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    struct PoolInfo {
        address addr;
        bool delegate;
        ISupportable supportable;
        uint8 supportingRatio;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
        uint256 supply;
    }

    uint256 private constant PRECISION = 1e20;

    uint256 public immutable override initialRewardPerBlock;
    uint256 public immutable override decreasingInterval;
    uint256 public immutable override startBlock;

    IMaidCoin public immutable override maidCoin;
    IRewardCalculator public override rewardCalculator;

    PoolInfo[] public override poolInfo;
    mapping(uint256 => mapping(uint256 => UserInfo)) public override userInfo;
    mapping(address => bool) public override mintableByAddr;
    uint256 public override totalAllocPoint;

    constructor(
        uint256 _initialRewardPerBlock,
        uint256 _decreasingInterval,
        uint256 _startBlock,
        IMaidCoin _maidCoin
    ) {
        initialRewardPerBlock = _initialRewardPerBlock;
        decreasingInterval = _decreasingInterval;
        startBlock = _startBlock;
        maidCoin = _maidCoin;
    }

    function poolCount() external view override returns (uint256) {
        return poolInfo.length;
    }

    function pendingReward(uint256 pid, uint256 userId) external view override returns (uint256) {
        PoolInfo memory pool = poolInfo[pid];
        UserInfo memory user = userInfo[pid][userId];
        (uint256 accRewardPerShare, uint256 supply) = (pool.accRewardPerShare, pool.supply);
        if (block.number > pool.lastRewardBlock && supply != 0) {
            uint256 reward = ((block.number - pool.lastRewardBlock) * rewardPerBlock() * pool.allocPoint) /
                totalAllocPoint;
            accRewardPerShare = accRewardPerShare + (reward * PRECISION) / supply;
        }
        uint256 pending = ((user.amount * accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pool.supportingRatio == 0) {
            return pending;
        } else {
            return pending - ((pending * pool.supportingRatio) / 100);
        }
    }

    function rewardPerBlock() public view override returns (uint256) {
        if (address(rewardCalculator) != address(0)) {
            return rewardCalculator.rewardPerBlock();
        }
        uint256 era = (block.number - startBlock) / decreasingInterval;
        return initialRewardPerBlock / (era + 1);
    }

    function changeRewardCalculator(address addr) external override onlyOwner {
        rewardCalculator = IRewardCalculator(addr);
        emit ChangeRewardCalculator(addr);
    }

    function add(
        address addr,
        bool delegate,
        bool mintable,
        address supportable,
        uint8 supportingRatio,
        uint256 allocPoint
    ) external override onlyOwner {
        if (supportable != address(0)) {
            require(supportingRatio > 0 && supportingRatio <= 80, "TheMaster: outranged supportingRatio");
        } else {
            require(supportingRatio == 0, "TheMaster: not supportable pool");
        }
        massUpdatePools();
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint += allocPoint;
        uint256 pid = poolInfo.length;
        poolInfo.push(
            PoolInfo(
                addr,
                delegate,
                ISupportable(supportable),
                supportingRatio,
                allocPoint,
                lastRewardBlock,
                0,
                0
            )
        );
        if (mintable == true) {
            mintableByAddr[addr] = true;
        }
        emit Add(pid, addr, delegate, mintableByAddr[addr], supportable, supportingRatio, allocPoint);
    }

    function set(uint256 pid, uint256 allocPoint) external override onlyOwner {
        massUpdatePools();
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + allocPoint;
        poolInfo[pid].allocPoint = allocPoint;
        emit Set(pid, allocPoint);
    }

    function updatePool(PoolInfo storage pool) internal {
        uint256 _lastRewardBlock = pool.lastRewardBlock;
        if (block.number <= _lastRewardBlock) {
            return;
        }
        uint256 supply = pool.supply;
        if (supply == 0 || pool.allocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 reward = ((block.number - _lastRewardBlock) * rewardPerBlock() * pool.allocPoint) / totalAllocPoint;
        maidCoin.mint(address(this), reward);
        pool.accRewardPerShare = pool.accRewardPerShare + (reward * PRECISION) / supply;
        pool.lastRewardBlock = block.number;
    }

    function massUpdatePools() internal {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(poolInfo[pid]);
        }
    }

    function deposit(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        require(address(pool.supportable) == address(0), "TheMaster: use support func");
        UserInfo storage user = userInfo[pid][userId];
        if (pool.delegate) {
            require(pool.addr == msg.sender, "TheMaster: Not called by delegate");
            _deposit(pool, user, amount, false);
        } else {
            require(address(uint160(userId)) == msg.sender, "TheMaster: deposit to your address");
            _deposit(pool, user, amount, true);
        }
        emit Deposit(userId, pid, amount);
    }

    function _deposit(
        PoolInfo storage pool,
        UserInfo storage user,
        uint256 amount,
        bool tokenTransfer
    ) internal {
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 _amount = user.amount;
        if (_amount > 0) {
            uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
            if (pending > 0) safeRewardTransfer(msg.sender, pending);
        }
        if (amount > 0) {
            if (tokenTransfer) {
                IERC20(pool.addr).safeTransferFrom(msg.sender, address(this), amount);
            }
            pool.supply += amount;
            _amount += amount;
            user.amount = _amount;
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
    }

    function depositWithPermit(
        uint256 pid,
        uint256 amount,
        uint256 userId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        IUniswapV2ERC20(poolInfo[pid].addr).permit(msg.sender, address(this), amount, deadline, v, r, s);
        deposit(pid, amount, userId);
    }

    function depositWithPermitMax(
        uint256 pid,
        uint256 amount,
        uint256 userId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        IUniswapV2ERC20(poolInfo[pid].addr).permit(msg.sender, address(this), type(uint256).max, deadline, v, r, s);
        deposit(pid, amount, userId);
    }

    function withdraw(
        uint256 pid,
        uint256 amount,
        uint256 userId
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        require(address(pool.supportable) == address(0), "TheMaster: use desupport func");
        UserInfo storage user = userInfo[pid][userId];
        if (pool.delegate) {
            require(pool.addr == msg.sender, "TheMaster: Not called by delegate");
            _withdraw(pool, user, amount, false);
        } else {
            require(address(uint160(userId)) == msg.sender, "TheMaster: Not called by user");
            _withdraw(pool, user, amount, true);
        }
        emit Withdraw(userId, pid, amount);
    }

    function _withdraw(
        PoolInfo storage pool,
        UserInfo storage user,
        uint256 amount,
        bool tokenTransfer
    ) internal {
        uint256 _amount = user.amount;
        require(_amount >= amount, "TheMaster: Insufficient amount");
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pending > 0) safeRewardTransfer(msg.sender, pending);
        if (amount > 0) {
            pool.supply -= amount;
            _amount -= amount;
            user.amount = _amount;
            if (tokenTransfer) {
                IERC20(pool.addr).safeTransfer(msg.sender, amount);
            }
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
    }

    function emergencyWithdraw(uint256 pid) external override {
        PoolInfo storage pool = poolInfo[pid];
        require(address(pool.supportable) == address(0), "TheMaster: use desupport func");
        require(!pool.delegate, "TheMaster: Pool should be non-delegate");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        uint256 amounts = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.supply -= amounts;
        IERC20(pool.addr).safeTransfer(msg.sender, amounts);
        emit EmergencyWithdraw(msg.sender, pid, amounts);
    }

    function support(
        uint256 pid,
        uint256 amount,
        uint256 supportTo
    ) public override {
        PoolInfo storage pool = poolInfo[pid];
        ISupportable supportable = pool.supportable;
        require(address(supportable) != address(0), "TheMaster: use deposit func");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 _amount = user.amount;
        if (_amount > 0) {
            uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
            if (pending > 0) {
                (address to, uint256 amounts) = supportable.shareRewards(pending, msg.sender, pool.supportingRatio);
                if (amounts > 0) safeRewardTransfer(to, amounts);
                safeRewardTransfer(msg.sender, pending - amounts);
            }
        }
        if (amount > 0) {
            if (_amount == 0) {
                supportable.setSupportingTo(msg.sender, supportTo, amount);
            } else {
                supportable.changeSupportedPower(msg.sender, int256(amount));
            }
            IERC20(pool.addr).safeTransferFrom(msg.sender, address(this), amount);
            pool.supply += amount;
            _amount += amount;
            user.amount = _amount;
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
        emit Support(msg.sender, pid, amount);
    }

    function supportWithPermit(
        uint256 pid,
        uint256 amount,
        uint256 supportTo,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        IUniswapV2ERC20(poolInfo[pid].addr).permit(msg.sender, address(this), amount, deadline, v, r, s);
        support(pid, amount, supportTo);
    }

    function supportWithPermitMax(
        uint256 pid,
        uint256 amount,
        uint256 supportTo,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        IUniswapV2ERC20(poolInfo[pid].addr).permit(msg.sender, address(this), type(uint256).max, deadline, v, r, s);
        support(pid, amount, supportTo);
    }

    function desupport(uint256 pid, uint256 amount) external override {
        PoolInfo storage pool = poolInfo[pid];
        ISupportable supportable = pool.supportable;
        require(address(supportable) != address(0), "TheMaster: use withdraw func");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        uint256 _amount = user.amount;
        require(_amount >= amount, "TheMaster: Insufficient amount");
        updatePool(pool);
        uint256 _accRewardPerShare = pool.accRewardPerShare;
        uint256 pending = ((_amount * _accRewardPerShare) / PRECISION) - user.rewardDebt;
        if (pending > 0) {
            (address to, uint256 amounts) = supportable.shareRewards(pending, msg.sender, pool.supportingRatio);
            if (amounts > 0) safeRewardTransfer(to, amounts);
            safeRewardTransfer(msg.sender, pending - amounts);
        }
        if (amount > 0) {
            supportable.changeSupportedPower(msg.sender, -int256(amount));
            pool.supply -= amount;
            _amount -= amount;
            user.amount = _amount;
            IERC20(pool.addr).safeTransfer(msg.sender, amount);
        }
        user.rewardDebt = (_amount * _accRewardPerShare) / PRECISION;
        emit Desupport(msg.sender, pid, amount);
    }

    function emergencyDesupport(uint256 pid) external override {
        PoolInfo storage pool = poolInfo[pid];
        ISupportable supportable = pool.supportable;
        require(address(supportable) == address(0), "TheMaster: use emergencyWithdraw func");
        UserInfo storage user = userInfo[pid][uint256(uint160(msg.sender))];
        uint256 amounts = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.supply -= amounts;
        supportable.changeSupportedPower(msg.sender, -int256(amounts));
        IERC20(pool.addr).safeTransfer(msg.sender, amounts);
        emit EmergencyDesupport(msg.sender, pid, amounts);
    }

    function mint(address to, uint256 amount) external override {
        require(mintableByAddr[msg.sender], "TheMaster: called from un-mintable");
        maidCoin.mint(to, amount);
    }

    function safeRewardTransfer(address to, uint256 amount) internal {
        uint256 balance = maidCoin.balanceOf(address(this));
        if (amount > balance) {
            maidCoin.transfer(to, balance);
        } else {
            maidCoin.transfer(to, amount);
        }
    }
}