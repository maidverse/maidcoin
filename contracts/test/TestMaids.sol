// Sources flattened with hardhat v2.3.0 https://hardhat.org

// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v4.1.0

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[EIP].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/token/ERC721/IERC721.sol@v4.1.0


pragma solidity ^0.8.0;

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface IERC721 is IERC165 {
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @dev Returns the number of tokens in ``owner``'s account.
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    /**
     * @dev Returns the owner of the `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be have been allowed to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address to, uint256 tokenId) external;

    /**
     * @dev Returns the account approved for `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function getApproved(uint256 tokenId) external view returns (address operator);

    /**
     * @dev Approve or remove `operator` as an operator for the caller.
     * Operators can call {transferFrom} or {safeTransferFrom} for any token owned by the caller.
     *
     * Requirements:
     *
     * - The `operator` cannot be the caller.
     *
     * Emits an {ApprovalForAll} event.
     */
    function setApprovalForAll(address operator, bool _approved) external;

    /**
     * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
     *
     * See {setApprovalForAll}
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    /**
      * @dev Safely transfers `tokenId` token from `from` to `to`.
      *
      * Requirements:
      *
      * - `from` cannot be the zero address.
      * - `to` cannot be the zero address.
      * - `tokenId` token must exist and be owned by `from`.
      * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
      * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
      *
      * Emits a {Transfer} event.
      */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
}


// File @openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol@v4.1.0


pragma solidity ^0.8.0;

/**
 * @title ERC-721 Non-Fungible Token Standard, optional metadata extension
 * @dev See https://eips.ethereum.org/EIPS/eip-721
 */
interface IERC721Metadata is IERC721 {

    /**
     * @dev Returns the token collection name.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the token collection symbol.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory);
}


// File contracts/interfaces/IOwnable.sol


pragma solidity >=0.5.0;

interface IOwnable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function owner() external view returns (address);

    function renounceOwnership() external;

    function transferOwnership(address newOwner) external;
}


// File contracts/interfaces/IBaseNFT721.sol


pragma solidity >=0.5.0;
interface IBaseNFT721 is IERC721, IERC721Metadata, IOwnable {
    event SetTokenURI(uint256 indexed tokenId, string uri);
    event SetBaseURI(string uri);
    event ParkTokenIds(uint256 toTokenId);
    event Burn(uint256 indexed tokenId, uint256 indexed label, bytes32 data);

    function PERMIT_TYPEHASH() external view returns (bytes32);

    function PERMIT_ALL_TYPEHASH() external view returns (bytes32);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function factory() external view returns (address);

    function nonces(uint256 tokenId) external view returns (uint256);

    function noncesForAll(address account) external view returns (uint256);

    function parked(uint256 tokenId) external view returns (bool);

    function initialize(
        string calldata name,
        string calldata symbol,
        address _owner
    ) external;

    function setTokenURI(uint256 id, string memory uri) external;

    function setBaseURI(string memory uri) external;

    function parkTokenIds(uint256 toTokenId) external;

    function mint(
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;

    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        bytes calldata data
    ) external;

    function burn(
        uint256 tokenId,
        uint256 label,
        bytes32 data
    ) external;

    function burnBatch(uint256[] calldata tokenIds) external;

    function permit(
        address spender,
        uint256 tokenId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function permitAll(
        address owner,
        address spender,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}


// File contracts/libraries/Orders.sol


pragma solidity ^0.8.5;

library Orders {
    // keccak256("Ask(address signer,address proxy,address token,uint256 tokenId,uint256 amount,address strategy,address currency,address recipient,uint256 deadline,bytes params)")
    bytes32 internal constant ASK_TYPEHASH = 0x5fbc9a24e1532fa5245d1ec2dc5592849ae97ac5475f361b1a1f7a6e2ac9b2fd;
    // keccak256("Bid(bytes32 askHash,address signer,uint256 amount,uint256 price,address recipient,address referrer)")
    bytes32 internal constant BID_TYPEHASH = 0xb98e1dc48988064e6dfb813618609d7da80a8841e5f277039788ac4b50d497b2;

    struct Ask {
        address signer;
        address proxy;
        address token;
        uint256 tokenId;
        uint256 amount;
        address strategy;
        address currency;
        address recipient;
        uint256 deadline;
        bytes params;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct Bid {
        bytes32 askHash;
        address signer;
        uint256 amount;
        uint256 price;
        address recipient;
        address referrer;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function hash(Ask memory ask) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    ASK_TYPEHASH,
                    ask.signer,
                    ask.proxy,
                    ask.token,
                    ask.tokenId,
                    ask.amount,
                    ask.strategy,
                    ask.currency,
                    ask.recipient,
                    ask.deadline,
                    keccak256(ask.params)
                )
            );
    }

    function hash(Bid memory bid) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(BID_TYPEHASH, bid.askHash, bid.signer, bid.amount, bid.price, bid.recipient, bid.referrer)
            );
    }
}


// File contracts/interfaces/IBaseExchange.sol


pragma solidity >=0.5.0;
interface IBaseExchange {
    event Cancel(bytes32 indexed hash);
    event Claim(
        bytes32 indexed hash,
        address bidder,
        uint256 amount,
        uint256 price,
        address recipient,
        address referrer
    );
    event Bid(bytes32 indexed hash, address bidder, uint256 amount, uint256 price, address recipient, address referrer);
    event UpdateApprovedBidHash(
        address indexed proxy,
        bytes32 indexed askHash,
        address indexed bidder,
        bytes32 bidHash
    );

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function factory() external view returns (address);

    function canTrade(address token) external view returns (bool);

    function bestBid(bytes32 hash)
        external
        view
        returns (
            address bidder,
            uint256 amount,
            uint256 price,
            address recipient,
            address referrer,
            uint256 blockNumber
        );

    function isCancelledOrClaimed(bytes32 hash) external view returns (bool);

    function amountFilled(bytes32 hash) external view returns (uint256);

    function approvedBidHash(
        address proxy,
        bytes32 askHash,
        address bidder
    ) external view returns (bytes32 bidHash);

    function cancel(Orders.Ask memory order) external;

    function updateApprovedBidHash(
        bytes32 askHash,
        address bidder,
        bytes32 bidHash
    ) external;

    function bid(Orders.Ask memory askOrder, Orders.Bid memory bidOrder) external returns (bool executed);

    function bid(
        Orders.Ask memory askOrder,
        uint256 bidAmount,
        uint256 bidPrice,
        address bidRecipient,
        address bidReferrer
    ) external returns (bool executed);

    function claim(Orders.Ask memory order) external;
}


// File contracts/interfaces/INFT721.sol


pragma solidity >=0.5.0;
interface INFT721 is IBaseNFT721, IBaseExchange {
    event SetRoyaltyFeeRecipient(address recipient);
    event SetRoyaltyFee(uint8 fee);

    function initialize(
        address _owner,
        string calldata _name,
        string calldata _symbol,
        uint256[] calldata tokenIds,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    ) external;

    function initialize(
        address _owner,
        string calldata _name,
        string calldata _symbol,
        uint256 toTokenId,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    ) external;

    function DOMAIN_SEPARATOR() external view override(IBaseNFT721, IBaseExchange) returns (bytes32);

    function factory() external view override(IBaseNFT721, IBaseExchange) returns (address);

    function setRoyaltyFeeRecipient(address _royaltyFeeRecipient) external;

    function setRoyaltyFee(uint8 _royaltyFee) external;
}


// File @openzeppelin/contracts/utils/Strings.sol@v4.1.0


pragma solidity ^0.8.0;

/**
 * @dev String operations.
 */
library Strings {
    bytes16 private constant alphabet = "0123456789abcdef";

    /**
     * @dev Converts a `uint256` to its ASCII `string` decimal representation.
     */
    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation.
     */
    function toHexString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0x00";
        }
        uint256 temp = value;
        uint256 length = 0;
        while (temp != 0) {
            length++;
            temp >>= 8;
        }
        return toHexString(value, length);
    }

    /**
     * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length.
     */
    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = alphabet[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }

}


// File contracts/interfaces/IERC1271.sol

pragma solidity >=0.5.0;

/// @title Interface for verifying contract-based account signatures
/// @notice Interface that verifies provided signature for the data
/// @dev Interface defined by EIP-1271
interface IERC1271 {
    /// @notice Returns whether the provided signature is valid for the provided data
    /// @dev MUST return the bytes4 magic value 0x1626ba7e when function passes.
    /// MUST NOT modify state (using STATICCALL for solc < 0.5, view modifier for solc > 0.5).
    /// MUST allow external calls.
    /// @param hash Hash of the data to be signed
    /// @param signature Signature byte array associated with _data
    /// @return magicValue The bytes4 magic value 0x1626ba7e
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);
}


// File contracts/interfaces/ITokenFactory.sol


pragma solidity >=0.5.0;

interface ITokenFactory {
    event SetBaseURI721(string uri);
    event SetBaseURI1155(string uri);
    event SetProtocolFeeRecipient(address recipient);
    event SetOperationalFee(uint8 fee);
    event SetOperationalFeeRecipient(address recipient);
    event SetDeployerWhitelisted(address deployer, bool whitelisted);
    event SetStrategyWhitelisted(address strategy, bool whitelisted);
    event UpgradeNFT721(address newTarget);
    event UpgradeNFT1155(address newTarget);
    event UpgradeSocialToken(address newTarget);
    event UpgradeERC721Exchange(address exchange);
    event UpgradeERC1155Exchange(address exchange);
    event DeployNFT721AndMintBatch(
        address indexed proxy,
        address indexed owner,
        string name,
        string symbol,
        uint256[] tokenIds,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    );
    event DeployNFT721AndPark(
        address indexed proxy,
        address indexed owner,
        string name,
        string symbol,
        uint256 toTokenId,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    );
    event DeployNFT1155AndMintBatch(
        address indexed proxy,
        address indexed owner,
        uint256[] tokenIds,
        uint256[] amounts,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    );
    event DeploySocialToken(
        address indexed proxy,
        address indexed owner,
        string name,
        string symbol,
        address indexed dividendToken,
        uint256 initialSupply
    );

    function MAX_ROYALTY_FEE() external view returns (uint8);

    function MAX_OPERATIONAL_FEE() external view returns (uint8);

    function PARK_TOKEN_IDS_721_TYPEHASH() external view returns (bytes32);

    function MINT_BATCH_721_TYPEHASH() external view returns (bytes32);

    function MINT_BATCH_1155_TYPEHASH() external view returns (bytes32);

    function MINT_SOCIAL_TOKEN_TYPEHASH() external view returns (bytes32);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function nonces(address account) external view returns (uint256);

    function baseURI721() external view returns (string memory);

    function baseURI1155() external view returns (string memory);

    function erc721Exchange() external view returns (address);

    function erc1155Exchange() external view returns (address);

    function protocolFeeInfo() external view returns (address recipient, uint8 permil);

    function operationalFeeInfo() external view returns (address recipient, uint8 permil);

    function isStrategyWhitelisted(address strategy) external view returns (bool);

    function isDeployerWhitelisted(address strategy) external view returns (bool);

    function setBaseURI721(string memory uri) external;

    function setBaseURI1155(string memory uri) external;

    function setProtocolFeeRecipient(address protocolFeeRecipient) external;

    function setOperationalFeeRecipient(address operationalFeeRecipient) external;

    function setOperationalFee(uint8 operationalFee) external;

    function setDeployerWhitelisted(address deployer, bool whitelisted) external;

    function setStrategyWhitelisted(address strategy, bool whitelisted) external;

    function upgradeNFT721(address newTarget) external;

    function upgradeNFT1155(address newTarget) external;

    function upgradeSocialToken(address newTarget) external;

    function upgradeERC721Exchange(address exchange) external;

    function upgradeERC1155Exchange(address exchange) external;

    function deployNFT721AndMintBatch(
        address owner,
        string calldata name,
        string calldata symbol,
        uint256[] calldata tokenIds,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    ) external returns (address nft);

    function deployNFT721AndPark(
        address owner,
        string calldata name,
        string calldata symbol,
        uint256 toTokenId,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    ) external returns (address nft);

    function isNFT721(address query) external view returns (bool result);

    function deployNFT1155AndMintBatch(
        address owner,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    ) external returns (address nft);

    function isNFT1155(address query) external view returns (bool result);

    function deploySocialToken(
        address owner,
        string memory name,
        string memory symbol,
        address dividendToken,
        uint256 initialSupply
    ) external returns (address proxy);

    function isSocialToken(address query) external view returns (bool result);

    function parkTokenIds721(
        address nft,
        uint256 toTokenId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function mintBatch721(
        address nft,
        address to,
        uint256[] calldata tokenIds,
        bytes calldata data,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function mintBatch1155(
        address nft,
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        bytes calldata data,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function mintSocialToken(
        address token,
        address to,
        uint256 amount,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}


// File @openzeppelin/contracts/proxy/utils/Initializable.sol@v4.1.0


// solhint-disable-next-line compiler-version
pragma solidity ^0.8.0;

/**
 * @dev This is a base contract to aid in writing upgradeable contracts, or any kind of contract that will be deployed
 * behind a proxy. Since a proxied contract can't have a constructor, it's common to move constructor logic to an
 * external initializer function, usually called `initialize`. It then becomes necessary to protect this initializer
 * function so it can only be called once. The {initializer} modifier provided by this contract will have this effect.
 *
 * TIP: To avoid leaving the proxy in an uninitialized state, the initializer function should be called as early as
 * possible by providing the encoded function call as the `_data` argument to {ERC1967Proxy-constructor}.
 *
 * CAUTION: When used with inheritance, manual care must be taken to not invoke a parent initializer twice, or to ensure
 * that all initializers are idempotent. This is not verified automatically as constructors are by Solidity.
 */
abstract contract Initializable {

    /**
     * @dev Indicates that the contract has been initialized.
     */
    bool private _initialized;

    /**
     * @dev Indicates that the contract is in the process of being initialized.
     */
    bool private _initializing;

    /**
     * @dev Modifier to protect an initializer function from being invoked twice.
     */
    modifier initializer() {
        require(_initializing || !_initialized, "Initializable: contract is already initialized");

        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) {
            _initializing = true;
            _initialized = true;
        }

        _;

        if (isTopLevelCall) {
            _initializing = false;
        }
    }
}


// File @openzeppelin/contracts/utils/introspection/ERC165.sol@v4.1.0


pragma solidity ^0.8.0;

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 *
 * Alternatively, {ERC165Storage} provides an easier to use but more expensive implementation.
 */
abstract contract ERC165 is IERC165 {
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}


// File @openzeppelin/contracts/token/ERC721/IERC721Receiver.sol@v4.1.0


pragma solidity ^0.8.0;

/**
 * @title ERC721 token receiver interface
 * @dev Interface for any contract that wants to support safeTransfers
 * from ERC721 asset contracts.
 */
interface IERC721Receiver {
    /**
     * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
     *
     * The selector can be obtained in Solidity with `IERC721.onERC721Received.selector`.
     */
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}


// File @openzeppelin/contracts/utils/Address.sol@v4.1.0


pragma solidity ^0.8.0;

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


// File contracts/base/ERC721Initializable.sol


pragma solidity ^0.8.5;
/**
 * @dev Implementation of https://eips.ethereum.org/EIPS/eip-721[ERC721] Non-Fungible Token Standard, including
 * the Metadata extension, but not including the Enumerable extension, which is available separately as
 * {ERC721Enumerable}.
 */
contract ERC721Initializable is Initializable, ERC165, IERC721, IERC721Metadata {
    using Address for address;
    using Strings for uint256;

    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    // Upper bound of tokenId parked
    uint256 private _toTokenIdParked;

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;

    // Mapping owner address to token count
    mapping(address => uint256) private _balances;

    // Mapping from token ID to approved address
    mapping(uint256 => address) private _tokenApprovals;

    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    function __ERC721_init(string memory name_, string memory symbol_) internal initializer {
        __ERC721_init_unchained(name_, symbol_);
    }

    function __ERC721_init_unchained(string memory name_, string memory symbol_) internal initializer {
        _name = name_;
        _symbol = symbol_;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721-balanceOf}.
     */
    function balanceOf(address owner) public view virtual override returns (uint256) {
        require(owner != address(0), "SHOYU: INVALID_OWNER");
        return _balances[owner];
    }

    /**
     * @dev See {IERC721-ownerOf}.
     */
    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        return _owners[tokenId];
    }

    /**
     * @dev See {IERC721Metadata-name}.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev See {IERC721Metadata-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "SHOYU: INVALID_TOKEN_ID");

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    /**
     * @dev Base URI for computing {tokenURI}. Empty by default, can be overriden
     * in child contracts.
     */
    function _baseURI() internal view virtual returns (string memory) {
        return "";
    }

    /**
     * @dev See {IERC721-approve}.
     */
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ERC721Initializable.ownerOf(tokenId);
        require(to != owner, "SHOYU: INVALID_TO");

        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "SHOYU: FORBIDDEN");

        _approve(to, tokenId);
    }

    /**
     * @dev See {IERC721-getApproved}.
     */
    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        require(_exists(tokenId), "SHOYU: INVALID_TOKEN_ID");

        return _tokenApprovals[tokenId];
    }

    /**
     * @dev See {IERC721-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @dev See {IERC721-transferFrom}.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(msg.sender, tokenId), "SHOYU: NOT_APPROVED_NOR_OWNER");

        _transfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public virtual override {
        require(_isApprovedOrOwner(msg.sender, tokenId), "SHOYU: FORBIDDEN");
        _safeTransfer(from, to, tokenId, _data);
    }

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * `_data` is additional data, it has no specified format and it is sent in call to `to`.
     *
     * This internal function is equivalent to {safeTransferFrom}, and can be used to e.g.
     * implement alternative mechanisms to perform token transfer, such as signature-based.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal virtual {
        _transfer(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "SHOYU: INVALID_RECEIVER");
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }

    /**
     * @dev Returns whether `spender` is allowed to manage `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        require(_exists(tokenId), "SHOYU: INVALID_TOKEN_ID");
        address owner = ERC721Initializable.ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _setApprovalForAll(
        address owner,
        address operator,
        bool approved
    ) internal {
        require(operator != owner, "SHOYU: INVALID_OPERATOR");

        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
    }

    function _parked(uint256 tokenId) internal view virtual returns (bool) {
        address owner = ERC721Initializable.ownerOf(tokenId);
        return owner == address(0) && tokenId < _toTokenIdParked;
    }

    function _parkTokenIds(uint256 toTokenId) internal virtual {
        uint256 fromTokenId = _toTokenIdParked;
        require(toTokenId > fromTokenId, "SHOYU: INVALID_TO_TOKEN_ID");

        _toTokenIdParked = toTokenId;
    }

    /**
     * @dev Safely mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    /**
     * @dev Same as {xref-ERC721-_safeMint-address-uint256-}[`_safeMint`], with an additional `data` parameter which is
     * forwarded in {IERC721Receiver-onERC721Received} to contract recipients.
     */
    function _safeMint(
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal virtual {
        _mint(to, tokenId);
        require(_checkOnERC721Received(address(0), to, tokenId, _data), "SHOYU: INVALID_RECEIVER");
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     */
    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "SHOYU: INVALID_TO");
        require(!_exists(tokenId), "SHOYU: ALREADY_MINTED");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Destroys `tokenId`.
     * The approval is cleared when the token is burned.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     *
     * Emits a {Transfer} event.
     */
    function _burn(uint256 tokenId) internal virtual {
        address owner = ERC721Initializable.ownerOf(tokenId);
        require(owner != address(0), "SHOYU: INVALID_TOKEN_ID");

        _beforeTokenTransfer(owner, address(0), tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _balances[owner] -= 1;
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        require(ERC721Initializable.ownerOf(tokenId) == from, "SHOYU: TRANSFER_FORBIDDEN");
        require(to != address(0), "SHOYU: INVALID_RECIPIENT");

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits a {Approval} event.
     */
    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ERC721Initializable.ownerOf(tokenId), to, tokenId);
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) private returns (bool) {
        if (to.isContract()) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, _data) returns (bytes4 retval) {
                return retval == IERC721Receiver(to).onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("SHOYU: INVALID_RECEIVER");
                } else {
                    // solhint-disable-next-line no-inline-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        } else {
            return true;
        }
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {}
}


// File contracts/base/OwnableInitializable.sol


pragma solidity ^0.8.5;
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
abstract contract OwnableInitializable is Initializable, IOwnable {
    address private _owner;

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function __Ownable_init(address __owner) internal initializer {
        __Ownable_init_unchained(__owner);
    }

    function __Ownable_init_unchained(address __owner) internal initializer {
        _owner = __owner;
        emit OwnershipTransferred(address(0), __owner);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual override returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == msg.sender, "SHOYU: FORBIDDEN");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual override onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        require(newOwner != address(0), "SHOYU: INVALID_NEW_OWNER");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}


// File contracts/libraries/Signature.sol


pragma solidity ^0.8.5;
library Signature {
    function recover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address) {
        // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
        // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
        // the valid range for s in (301): 0 < s < secp256k1n 첨 2 + 1, and for v in (302): v ??{27, 28}. Most
        // signatures from current libraries generate a unique signature with an s-value in the lower half order.
        //
        // If your library generates malleable signatures, such as s-values in the upper range, calculate a new s-value
        // with 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s1 and flip v from 27 to 28 or
        // vice versa. If your library also generates signatures with 0/1 for v instead 27/28, add 27 to v to accept
        // these malleable signatures as well.
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            "SHOYU: INVALID_SIGNATURE_S_VALUE"
        );
        require(v == 27 || v == 28, "SHOYU: INVALID_SIGNATURE_V_VALUE");

        // If the signature is valid (and not malleable), return the signer address
        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0), "SHOYU: INVALID_SIGNATURE");

        return signer;
    }

    function verify(
        bytes32 hash,
        address signer,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes32 domainSeparator
    ) internal view {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, hash));
        if (Address.isContract(signer)) {
            require(
                IERC1271(signer).isValidSignature(digest, abi.encodePacked(r, s, v)) == 0x1626ba7e,
                "SHOYU: UNAUTHORIZED"
            );
        } else {
            require(recover(digest, v, r, s) == signer, "SHOYU: UNAUTHORIZED");
        }
    }
}


// File contracts/base/BaseNFT721.sol


pragma solidity ^0.8.5;
abstract contract BaseNFT721 is ERC721Initializable, OwnableInitializable, IBaseNFT721 {
    // keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");
    bytes32 public constant override PERMIT_TYPEHASH =
        0x49ecf333e5b8c95c40fdafc95c1ad136e8914a8fb55e9dc8bb01eaa83a2df9ad;
    // keccak256("Permit(address owner,address spender,uint256 nonce,uint256 deadline)");
    bytes32 public constant override PERMIT_ALL_TYPEHASH =
        0xdaab21af31ece73a508939fedd476a5ee5129a5ed4bb091f3236ffb45394df62;
    bytes32 internal _DOMAIN_SEPARATOR;
    uint256 internal _CACHED_CHAIN_ID;

    address internal _factory;
    string internal __baseURI;
    mapping(uint256 => string) internal _uris;

    mapping(uint256 => uint256) public override nonces;
    mapping(address => uint256) public override noncesForAll;

    function initialize(
        string memory _name,
        string memory _symbol,
        address _owner
    ) public override initializer {
        __ERC721_init(_name, _symbol);
        __Ownable_init(_owner);
        _factory = msg.sender;

        _CACHED_CHAIN_ID = block.chainid;
        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                // keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
                0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f,
                keccak256(bytes(Strings.toHexString(uint160(address(this))))),
                0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6, // keccak256(bytes("1"))
                block.chainid,
                address(this)
            )
        );
    }

    function DOMAIN_SEPARATOR() public view virtual override returns (bytes32) {
        bytes32 domainSeparator;
        if (_CACHED_CHAIN_ID == block.chainid) domainSeparator = _DOMAIN_SEPARATOR;
        else {
            domainSeparator = keccak256(
                abi.encode(
                    // keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
                    0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f,
                    keccak256(bytes(Strings.toHexString(uint160(address(this))))),
                    0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6, // keccak256(bytes("1"))
                    block.chainid,
                    address(this)
                )
            );
        }
        return domainSeparator;
    }

    function factory() public view virtual override returns (address) {
        return _factory;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Initializable, IERC721Metadata)
        returns (string memory)
    {
        require(_exists(tokenId) || _parked(tokenId), "SHOYU: INVALID_TOKEN_ID");

        string memory _uri = _uris[tokenId];
        if (bytes(_uri).length > 0) {
            return _uri;
        } else {
            string memory baseURI = __baseURI;
            if (bytes(baseURI).length > 0) {
                return string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"));
            } else {
                baseURI = ITokenFactory(_factory).baseURI721();
                string memory addy = Strings.toHexString(uint160(address(this)), 20);
                return string(abi.encodePacked(baseURI, addy, "/", Strings.toString(tokenId), ".json"));
            }
        }
    }

    function parked(uint256 tokenId) external view override returns (bool) {
        return _parked(tokenId);
    }

    function setTokenURI(uint256 id, string memory newURI) external override onlyOwner {
        _uris[id] = newURI;

        emit SetTokenURI(id, newURI);
    }

    function setBaseURI(string memory uri) external override onlyOwner {
        __baseURI = uri;

        emit SetBaseURI(uri);
    }

    function parkTokenIds(uint256 toTokenId) external override {
        require(owner() == msg.sender || _factory == msg.sender, "SHOYU: FORBIDDEN");

        _parkTokenIds(toTokenId);

        emit ParkTokenIds(toTokenId);
    }

    function mint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) external override {
        require(owner() == msg.sender || _factory == msg.sender, "SHOYU: FORBIDDEN");

        _safeMint(to, tokenId, data);
    }

    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        bytes memory data
    ) external override {
        require(owner() == msg.sender || _factory == msg.sender, "SHOYU: FORBIDDEN");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _safeMint(to, tokenIds[i], data);
        }
    }

    function burn(
        uint256 tokenId,
        uint256 label,
        bytes32 data
    ) external override {
        require(ownerOf(tokenId) == msg.sender, "SHOYU: FORBIDDEN");

        _burn(tokenId);

        emit Burn(tokenId, label, data);
    }

    function burnBatch(uint256[] memory tokenIds) external override {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(ownerOf(tokenId) == msg.sender, "SHOYU: FORBIDDEN");

            _burn(tokenId);
        }
    }

    function permit(
        address spender,
        uint256 tokenId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        require(block.timestamp <= deadline, "SHOYU: EXPIRED");

        address owner = ownerOf(tokenId);
        require(owner != address(0), "SHOYU: INVALID_TOKENID");
        require(spender != owner, "SHOYU: NOT_NECESSARY");

        bytes32 hash = keccak256(abi.encode(PERMIT_TYPEHASH, spender, tokenId, nonces[tokenId]++, deadline));
        Signature.verify(hash, owner, v, r, s, DOMAIN_SEPARATOR());

        _approve(spender, tokenId);
    }

    function permitAll(
        address owner,
        address spender,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        require(block.timestamp <= deadline, "SHOYU: EXPIRED");
        require(owner != address(0), "SHOYU: INVALID_ADDRESS");
        require(spender != owner, "SHOYU: NOT_NECESSARY");

        bytes32 hash = keccak256(abi.encode(PERMIT_ALL_TYPEHASH, owner, spender, noncesForAll[owner]++, deadline));
        Signature.verify(hash, owner, v, r, s, DOMAIN_SEPARATOR());

        _setApprovalForAll(owner, spender, true);
    }
}


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v4.1.0


pragma solidity ^0.8.0;

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


// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v4.1.0


pragma solidity ^0.8.0;


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


// File contracts/interfaces/IStrategy.sol


pragma solidity >=0.5.0;
interface IStrategy {
    function canClaim(
        address proxy,
        uint256 deadline,
        bytes memory params,
        address bidder,
        uint256 bidPrice,
        address bestBidder,
        uint256 bestBidPrice,
        uint256 bestBidTimestamp
    ) external view returns (bool);

    function canBid(
        address proxy,
        uint256 deadline,
        bytes memory params,
        address bidder,
        uint256 bidPrice,
        address bestBidder,
        uint256 bestBidPrice,
        uint256 bestBidTimestamp
    ) external view returns (bool);
}


// File @openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol@v4.1.0


pragma solidity ^0.8.0;

/**
 * @dev Interface for the optional metadata functions from the ERC20 standard.
 *
 * _Available since v4.1._
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}


// File contracts/interfaces/IDividendPayingERC20.sol


pragma solidity >=0.5.0;
interface IDividendPayingERC20 is IERC20, IERC20Metadata {
    /// @dev This event MUST emit when erc20/ether dividend is synced.
    /// @param increased The amount of increased erc20/ether in wei.
    event Sync(uint256 increased);

    /// @dev This event MUST emit when an address withdraws their dividend.
    /// @param to The address which withdraws erc20/ether from this contract.
    /// @param amount The amount of withdrawn erc20/ether in wei.
    event DividendWithdrawn(address indexed to, uint256 amount);

    function MAGNITUDE() external view returns (uint256);

    function dividendToken() external view returns (address);

    function totalDividend() external view returns (uint256);

    function sync() external payable returns (uint256 increased);

    function withdrawDividend() external;

    /// @notice View the amount of dividend in wei that an address can withdraw.
    /// @param account The address of a token holder.
    /// @return The amount of dividend in wei that `account` can withdraw.
    function dividendOf(address account) external view returns (uint256);

    /// @notice View the amount of dividend in wei that an address can withdraw.
    /// @param account The address of a token holder.
    /// @return The amount of dividend in wei that `account` can withdraw.
    function withdrawableDividendOf(address account) external view returns (uint256);

    /// @notice View the amount of dividend in wei that an address has withdrawn.
    /// @param account The address of a token holder.
    /// @return The amount of dividend in wei that `account` has withdrawn.
    function withdrawnDividendOf(address account) external view returns (uint256);

    /// @notice View the amount of dividend in wei that an address has earned in total.
    /// @dev accumulativeDividendOf(account) = withdrawableDividendOf(account) + withdrawnDividendOf(account)
    /// = (magnifiedDividendPerShare * balanceOf(account) + magnifiedDividendCorrections[account]) / magnitude
    /// @param account The address of a token holder.
    /// @return The amount of dividend in wei that `account` has earned in total.
    function accumulativeDividendOf(address account) external view returns (uint256);
}


// File contracts/base/ReentrancyGuardInitializable.sol


pragma solidity ^0.8.5;
/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuardInitializable is Initializable {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    bool private constant _NOT_ENTERED = false;
    bool private constant _ENTERED = true;

    bool private _status;

    function __ReentrancyGuard_init() internal initializer {
        __ReentrancyGuard_init_unchained();
    }

    function __ReentrancyGuard_init_unchained() internal initializer {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and make it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "SHOYU: REENTRANT");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}


// File contracts/interfaces/IERC2981.sol


pragma solidity ^0.8.5;
///
/// @dev Interface for the NFT Royalty Standard
///
interface IERC2981 is IERC165 {
    /// ERC165 bytes to add to interface array - set in parent contract
    /// implementing this standard
    ///
    /// bytes4(keccak256("royaltyInfo(uint256,uint256)")) == 0x2a55205a
    /// bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;
    /// _registerInterface(_INTERFACE_ID_ERC2981);

    /// @notice Called with the sale price to determine how much royalty
    //          is owed and to whom.
    /// @param _tokenId - the NFT asset queried for royalty information
    /// @param _salePrice - the sale price of the NFT asset specified by _tokenId
    /// @return receiver - address of who should be sent the royalty payment
    /// @return royaltyAmount - the royalty payment amount for _salePrice
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount);
}


// File contracts/base/BaseExchange.sol


pragma solidity ^0.8.5;
abstract contract BaseExchange is ReentrancyGuardInitializable, IBaseExchange {
    using SafeERC20 for IERC20;
    using Orders for Orders.Ask;
    using Orders for Orders.Bid;

    struct BestBid {
        address bidder;
        uint256 amount;
        uint256 price;
        address recipient;
        address referrer;
        uint256 timestamp;
    }

    mapping(address => mapping(bytes32 => mapping(address => bytes32))) internal _bidHashes;

    mapping(bytes32 => BestBid) public override bestBid;
    mapping(bytes32 => bool) public override isCancelledOrClaimed;
    mapping(bytes32 => uint256) public override amountFilled;

    function __BaseNFTExchange_init() internal initializer {
        __ReentrancyGuard_init();
    }

    function DOMAIN_SEPARATOR() public view virtual override returns (bytes32);

    function factory() public view virtual override returns (address);

    function canTrade(address token) public view virtual override returns (bool) {
        return token == address(this);
    }

    function approvedBidHash(
        address proxy,
        bytes32 askHash,
        address bidder
    ) external view override returns (bytes32 bidHash) {
        return _bidHashes[proxy][askHash][bidder];
    }

    function _transfer(
        address token,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) internal virtual;

    function cancel(Orders.Ask memory order) external override {
        require(order.signer == msg.sender || order.proxy == msg.sender, "SHOYU: FORBIDDEN");

        bytes32 hash = order.hash();
        require(bestBid[hash].bidder == address(0), "SHOYU: BID_EXISTS");

        isCancelledOrClaimed[hash] = true;

        emit Cancel(hash);
    }

    function updateApprovedBidHash(
        bytes32 askHash,
        address bidder,
        bytes32 bidHash
    ) external override {
        _bidHashes[msg.sender][askHash][bidder] = bidHash;
        emit UpdateApprovedBidHash(msg.sender, askHash, bidder, bidHash);
    }

    function bid(Orders.Ask memory askOrder, Orders.Bid memory bidOrder)
        external
        override
        nonReentrant
        returns (bool executed)
    {
        bytes32 askHash = askOrder.hash();
        require(askHash == bidOrder.askHash, "SHOYU: UNMATCHED_HASH");
        require(bidOrder.signer != address(0), "SHOYU: INVALID_SIGNER");

        bytes32 bidHash = bidOrder.hash();
        if (askOrder.proxy != address(0)) {
            require(
                askOrder.proxy == msg.sender || _bidHashes[askOrder.proxy][askHash][bidOrder.signer] == bidHash,
                "SHOYU: FORBIDDEN"
            );
            delete _bidHashes[askOrder.proxy][askHash][bidOrder.signer];
            emit UpdateApprovedBidHash(askOrder.proxy, askHash, bidOrder.signer, bytes32(0));
        }

        Signature.verify(bidHash, bidOrder.signer, bidOrder.v, bidOrder.r, bidOrder.s, DOMAIN_SEPARATOR());

        return
            _bid(
                askOrder,
                askHash,
                bidOrder.signer,
                bidOrder.amount,
                bidOrder.price,
                bidOrder.recipient,
                bidOrder.referrer
            );
    }

    function bid(
        Orders.Ask memory askOrder,
        uint256 bidAmount,
        uint256 bidPrice,
        address bidRecipient,
        address bidReferrer
    ) external override nonReentrant returns (bool executed) {
        require(askOrder.proxy == address(0), "SHOYU: FORBIDDEN");

        return _bid(askOrder, askOrder.hash(), msg.sender, bidAmount, bidPrice, bidRecipient, bidReferrer);
    }

    function _bid(
        Orders.Ask memory askOrder,
        bytes32 askHash,
        address bidder,
        uint256 bidAmount,
        uint256 bidPrice,
        address bidRecipient,
        address bidReferrer
    ) internal returns (bool executed) {
        require(canTrade(askOrder.token), "SHOYU: INVALID_EXCHANGE");
        require(bidAmount > 0, "SHOYU: INVALID_AMOUNT");
        uint256 _amountFilled = amountFilled[askHash];
        require(_amountFilled + bidAmount <= askOrder.amount, "SHOYU: SOLD_OUT");

        _validate(askOrder, askHash);
        Signature.verify(askHash, askOrder.signer, askOrder.v, askOrder.r, askOrder.s, DOMAIN_SEPARATOR());

        BestBid storage best = bestBid[askHash];
        if (
            IStrategy(askOrder.strategy).canClaim(
                askOrder.proxy,
                askOrder.deadline,
                askOrder.params,
                bidder,
                bidPrice,
                best.bidder,
                best.price,
                best.timestamp
            )
        ) {
            amountFilled[askHash] = _amountFilled + bidAmount;
            if (_amountFilled + bidAmount == askOrder.amount) isCancelledOrClaimed[askHash] = true;

            address recipient = askOrder.recipient;
            if (recipient == address(0)) recipient = askOrder.signer;
            require(
                _transferFeesAndFunds(
                    askOrder.token,
                    askOrder.tokenId,
                    askOrder.currency,
                    bidder,
                    recipient,
                    bidPrice * bidAmount
                ),
                "SHOYU: FAILED_TO_TRANSFER_FUNDS"
            );

            if (bidRecipient == address(0)) bidRecipient = bidder;
            _transfer(askOrder.token, askOrder.signer, bidRecipient, askOrder.tokenId, bidAmount);

            emit Claim(askHash, bidder, bidAmount, bidPrice, bidRecipient, bidReferrer);
            return true;
        } else {
            if (
                IStrategy(askOrder.strategy).canBid(
                    askOrder.proxy,
                    askOrder.deadline,
                    askOrder.params,
                    bidder,
                    bidPrice,
                    best.bidder,
                    best.price,
                    best.timestamp
                )
            ) {
                best.bidder = bidder;
                best.amount = bidAmount;
                best.price = bidPrice;
                best.recipient = bidRecipient;
                best.referrer = bidReferrer;
                best.timestamp = block.timestamp;

                emit Bid(askHash, bidder, bidAmount, bidPrice, bidRecipient, bidReferrer);
                return false;
            }
        }
        revert("SHOYU: FAILURE");
    }

    function claim(Orders.Ask memory askOrder) external override nonReentrant {
        require(canTrade(askOrder.token), "SHOYU: INVALID_EXCHANGE");

        bytes32 askHash = askOrder.hash();
        _validate(askOrder, askHash);
        Signature.verify(askHash, askOrder.signer, askOrder.v, askOrder.r, askOrder.s, DOMAIN_SEPARATOR());

        BestBid memory best = bestBid[askHash];
        require(
            IStrategy(askOrder.strategy).canClaim(
                askOrder.proxy,
                askOrder.deadline,
                askOrder.params,
                best.bidder,
                best.price,
                best.bidder,
                best.price,
                best.timestamp
            ),
            "SHOYU: FAILURE"
        );

        address recipient = askOrder.recipient;
        if (recipient == address(0)) recipient = askOrder.signer;

        isCancelledOrClaimed[askHash] = true;
        require(
            _transferFeesAndFunds(
                askOrder.token,
                askOrder.tokenId,
                askOrder.currency,
                best.bidder,
                recipient,
                best.price * best.amount
            ),
            "SHOYU: FAILED_TO_TRANSFER_FUNDS"
        );
        amountFilled[askHash] = amountFilled[askHash] + best.amount;

        address bidRecipient = best.recipient;
        if (bidRecipient == address(0)) bidRecipient = best.bidder;
        _transfer(askOrder.token, askOrder.signer, bidRecipient, askOrder.tokenId, best.amount);

        delete bestBid[askHash];

        emit Claim(askHash, best.bidder, best.amount, best.price, bidRecipient, best.referrer);
    }

    function _validate(Orders.Ask memory askOrder, bytes32 askHash) internal view {
        require(!isCancelledOrClaimed[askHash], "SHOYU: CANCELLED_OR_CLAIMED");

        require(askOrder.signer != address(0), "SHOYU: INVALID_MAKER");
        require(askOrder.token != address(0), "SHOYU: INVALID_NFT");
        require(askOrder.amount > 0, "SHOYU: INVALID_AMOUNT");
        require(askOrder.strategy != address(0), "SHOYU: INVALID_STRATEGY");
        require(askOrder.currency != address(0), "SHOYU: INVALID_CURRENCY");
        require(ITokenFactory(factory()).isStrategyWhitelisted(askOrder.strategy), "SHOYU: STRATEGY_NOT_WHITELISTED");
    }

    function _transferFeesAndFunds(
        address token,
        uint256 tokenId,
        address currency,
        address from,
        address to,
        uint256 amount
    ) internal returns (bool) {
        if (!_safeTransferFrom(currency, from, address(this), amount)) {
            return false;
        }

        address _factory = factory();
        uint256 remainder = amount;
        {
            (address protocolFeeRecipient, uint8 protocolFeePermil) = ITokenFactory(_factory).protocolFeeInfo();
            uint256 protocolFeeAmount = (amount * protocolFeePermil) / 1000;
            IERC20(currency).safeTransfer(protocolFeeRecipient, protocolFeeAmount);
            remainder -= protocolFeeAmount;
        }

        {
            (address operationalFeeRecipient, uint8 operationalFeePermil) =
                ITokenFactory(_factory).operationalFeeInfo();
            uint256 operationalFeeAmount = (amount * operationalFeePermil) / 1000;
            IERC20(currency).safeTransfer(operationalFeeRecipient, operationalFeeAmount);
            remainder -= operationalFeeAmount;
        }

        try IERC2981(token).royaltyInfo(tokenId, amount) returns (
            address royaltyFeeRecipient,
            uint256 royaltyFeeAmount
        ) {
            if (royaltyFeeAmount > 0) {
                remainder -= royaltyFeeAmount;
                _transferRoyaltyFee(currency, royaltyFeeRecipient, royaltyFeeAmount);
            }
        } catch {}

        IERC20(currency).safeTransfer(to, remainder);
        return true;
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) private returns (bool) {
        (bool success, bytes memory returndata) =
            token.call(abi.encodeWithSelector(IERC20(token).transferFrom.selector, from, to, value));
        return success && (returndata.length == 0 || abi.decode(returndata, (bool)));
    }

    function _transferRoyaltyFee(
        address currency,
        address to,
        uint256 amount
    ) internal {
        IERC20(currency).safeTransfer(to, amount);
        if (Address.isContract(to)) {
            try IDividendPayingERC20(to).sync() returns (uint256) {} catch {}
        }
    }
}


// File contracts/NFT721V0.sol


pragma solidity ^0.8.5;
contract NFT721V0 is BaseNFT721, BaseExchange, IERC2981, INFT721 {
    uint8 internal _MAX_ROYALTY_FEE;

    address internal _royaltyFeeRecipient;
    uint8 internal _royaltyFee; // out of 1000

    function initialize(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint256[] memory tokenIds,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    ) external override initializer {
        __BaseNFTExchange_init();
        initialize(_name, _symbol, _owner);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _safeMint(_owner, tokenIds[i]);
        }

        _setRoyaltyFeeRecipient(royaltyFeeRecipient);
        _royaltyFee = type(uint8).max;
        if (royaltyFee != 0) _setRoyaltyFee(royaltyFee);
    }

    function initialize(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint256 toTokenId,
        address royaltyFeeRecipient,
        uint8 royaltyFee
    ) external override initializer {
        __BaseNFTExchange_init();
        initialize(_name, _symbol, _owner);
        _MAX_ROYALTY_FEE = ITokenFactory(_factory).MAX_ROYALTY_FEE();

        _parkTokenIds(toTokenId);

        emit ParkTokenIds(toTokenId);

        _setRoyaltyFeeRecipient(royaltyFeeRecipient);
        _royaltyFee = type(uint8).max;
        if (royaltyFee != 0) _setRoyaltyFee(royaltyFee);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Initializable, IERC165)
        returns (bool)
    {
        return interfaceId == 0x2a55205a || super.supportsInterface(interfaceId);
    }

    function DOMAIN_SEPARATOR() public view override(BaseNFT721, BaseExchange, INFT721) returns (bytes32) {
        return BaseNFT721.DOMAIN_SEPARATOR();
    }

    function factory() public view virtual override(BaseNFT721, BaseExchange, INFT721) returns (address) {
        return _factory;
    }

    function royaltyInfo(uint256, uint256 _salePrice) external view override returns (address, uint256) {
        uint256 royaltyAmount;
        if (_royaltyFee != type(uint8).max) royaltyAmount = (_salePrice * _royaltyFee) / 1000;
        return (_royaltyFeeRecipient, royaltyAmount);
    }

    function _transfer(
        address,
        address from,
        address to,
        uint256 tokenId,
        uint256
    ) internal override {
        if (from == owner() && _parked(tokenId)) {
            _safeMint(to, tokenId);
        } else {
            _transfer(from, to, tokenId);
        }
    }

    function setRoyaltyFeeRecipient(address royaltyFeeRecipient) public override onlyOwner {
        _setRoyaltyFeeRecipient(royaltyFeeRecipient);
    }

    function setRoyaltyFee(uint8 royaltyFee) public override onlyOwner {
        _setRoyaltyFee(royaltyFee);
    }

    function _setRoyaltyFeeRecipient(address royaltyFeeRecipient) internal {
        require(royaltyFeeRecipient != address(0), "SHOYU: INVALID_FEE_RECIPIENT");

        _royaltyFeeRecipient = royaltyFeeRecipient;

        emit SetRoyaltyFeeRecipient(royaltyFeeRecipient);
    }

    function _setRoyaltyFee(uint8 royaltyFee) internal {
        if (_royaltyFee == type(uint8).max) {
            require(royaltyFee <= _MAX_ROYALTY_FEE, "SHOYU: INVALID_FEE");
        } else {
            require(royaltyFee < _royaltyFee, "SHOYU: INVALID_FEE");
        }

        _royaltyFee = royaltyFee;

        emit SetRoyaltyFee(royaltyFee);
    }
}


// File contracts/interfaces/INFTLockable.sol


pragma solidity ^0.8.5;

interface INFTLockable {
    event SetLocked(bool locked);

    function locked() external view returns (bool);

    function setLocked(bool _locked) external;
}


// File contracts/base/NFTLockable.sol


pragma solidity ^0.8.5;
contract NFTLockable is OwnableInitializable, INFTLockable {
    bool internal _wasLocked;
    bool public override locked;

    modifier ensureUnlocked(address from) {
        require(msg.sender == owner() || from == owner() || !locked, "SHOYU: LOCKED");
        _;
    }

    function setLocked(bool _locked) external override onlyOwner {
        if (_locked) {
            require(!_wasLocked, "SHOYU: FORBIDDEN");
            _wasLocked = true;
        }
        locked = _locked;
        emit SetLocked(_locked);
    }
}


// File contracts/NFT721V1.sol


pragma solidity ^0.8.5;
contract NFT721V1 is NFT721V0, NFTLockable {
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override ensureUnlocked(from) {
        super._transfer(from, to, tokenId);
    }
}


// File contracts/interfaces/INFTContractURIdentifiable.sol


pragma solidity >=0.5.0;

interface INFT {
    function factory() external view returns (address);
}

interface INFTContractURIdentifiable {
    event SetContractURI(string uri);

    function contractURI() external view returns (string memory);

    function setContractURI(string calldata _contractURI) external;
}


// File contracts/base/NFT721ContractURIdentifiable.sol


pragma solidity ^0.8.5;
abstract contract NFT721ContractURIdentifiable is OwnableInitializable, INFTContractURIdentifiable {
    string internal _contractURI;

    function contractURI() external view virtual override returns (string memory);

    function setContractURI(string memory uri) external override onlyOwner {
        _contractURI = uri;

        emit SetContractURI(uri);
    }
}


// File contracts/interfaces/INFTStaticCallProxy.sol


pragma solidity >=0.5.0;

interface INFTStaticCallProxy {
    event SetTarget(address indexed target);

    function target() external view returns (address);

    function setTarget(address _target) external;
}


// File contracts/base/NFTStaticCallProxy.sol


pragma solidity ^0.8.5;
contract NFTStaticCallProxy is OwnableInitializable, INFTStaticCallProxy {
    address public override target;

    function setTarget(address _target) external override onlyOwner {
        target = _target;

        emit SetTarget(_target);
    }

    fallback() external payable {
        address _target = target;
        if (_target != address(0)) {
            assembly {
                let ptr := mload(0x40)
                let callsize := calldatasize()
                calldatacopy(ptr, 0, callsize)
                let result := staticcall(gas(), _target, ptr, callsize, 0, 0)
                let returnsize := returndatasize()
                returndatacopy(ptr, 0, returnsize)

                switch result
                    case 0 {
                        revert(ptr, returnsize)
                    }
                    default {
                        return(ptr, returnsize)
                    }
            }
        }
    }

    receive() external payable {
        // Empty
    }
}


// File contracts/NFT721V2.sol


pragma solidity ^0.8.5;
contract NFT721V2 is NFT721V1, NFT721ContractURIdentifiable, NFTStaticCallProxy {
    function contractURI() external view override returns (string memory) {
        if (bytes(_contractURI).length > 0) {
            return _contractURI;
        } else {
            string memory baseURI = __baseURI;
            if (bytes(baseURI).length == 0) {
                baseURI = ITokenFactory(_factory).baseURI721();
            }
            return string(abi.encodePacked(baseURI, Strings.toHexString(uint160(address(this)), 20), ".json"));
        }
    }
}