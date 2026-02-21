// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title PaymentProcessor
/// @notice Stripe-like on-chain payment processor for ADI Chain
/// @dev Merchants create sessions quoting a fiat amount; payers settle in native ADI or ERC20 tokens
contract PaymentProcessor {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct PaymentSession {
        bytes32 sessionId;
        address merchant;
        uint256 fiatAmount;      // e.g. 100_00 = 100.00 (2 decimal places)
        bytes3  fiatCurrency;    // "AED" | "USD"
        address tokenAddress;   // address(0) = native ADI
        uint256 tokenAmount;    // converted amount at session creation
        uint256 expiry;         // block.timestamp + TTL (900s = 15 min)
        bool    fulfilled;
    }

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant SESSION_TTL   = 15 minutes;
    uint256 public constant SLIPPAGE_BPS  = 200; // 2% = 200 basis points
    uint256 public constant BPS_DENOM     = 10_000;

    // ─── State ────────────────────────────────────────────────────────────────

    mapping(bytes32 => PaymentSession) private _sessions;
    mapping(address => bool) public authorizedCreators; // merchants registered via API
    address public owner;

    // ─── Events ───────────────────────────────────────────────────────────────

    event PaymentReceived(
        bytes32 indexed sessionId,
        address indexed merchant,
        address indexed payer,
        address token,
        uint256 tokenAmount,
        uint256 fiatAmount,
        bytes3  fiatCurrency
    );

    event SessionCreated(
        bytes32 indexed sessionId,
        address indexed merchant,
        uint256 fiatAmount,
        bytes3  fiatCurrency,
        address token,
        uint256 tokenAmount,
        uint256 expiry
    );

    event SessionExpired(bytes32 indexed sessionId);

    event CreatorAuthorized(address indexed creator, bool authorized);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Unauthorized();
    error SessionNotFound();
    error SessionExpiredError();
    error SessionAlreadyFulfilled();
    error InsufficientAmount(uint256 sent, uint256 minRequired);
    error ExcessiveAmount(uint256 sent, uint256 maxAllowed);
    error InvalidSession();
    error NativeTransferFailed();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorizedCreators[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        authorizedCreators[msg.sender] = true;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Grant or revoke session creation rights (called by owner/API backend wallet)
    function setCreatorAuthorized(address creator, bool authorized) external onlyOwner {
        authorizedCreators[creator] = authorized;
        emit CreatorAuthorized(creator, authorized);
    }

    /// @notice Transfer contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /// @notice Create a payment session (called by API backend on behalf of merchant)
    /// @param params Session parameters — sessionId must be a fresh unique bytes32
    /// @return sessionId The session identifier
    function createSession(PaymentSession memory params) external onlyAuthorized returns (bytes32) {
        if (params.sessionId == bytes32(0)) revert InvalidSession();
        if (_sessions[params.sessionId].merchant != address(0)) revert InvalidSession();
        if (params.merchant == address(0)) revert InvalidSession();
        if (params.tokenAmount == 0) revert InvalidSession();
        if (params.fiatAmount == 0) revert InvalidSession();

        params.expiry = block.timestamp + SESSION_TTL;
        params.fulfilled = false;
        _sessions[params.sessionId] = params;

        emit SessionCreated(
            params.sessionId,
            params.merchant,
            params.fiatAmount,
            params.fiatCurrency,
            params.tokenAddress,
            params.tokenAmount,
            params.expiry
        );

        return params.sessionId;
    }

    /// @notice Pay a session with native ADI
    /// @param sessionId The session to pay
    function payNative(bytes32 sessionId) external payable {
        PaymentSession storage session = _getValidSession(sessionId);
        if (session.tokenAddress != address(0)) revert InvalidSession(); // must be native payment session

        (uint256 minAmount, uint256 maxAmount) = _slippageBounds(session.tokenAmount);

        if (msg.value < minAmount) revert InsufficientAmount(msg.value, minAmount);
        if (msg.value > maxAmount) revert ExcessiveAmount(msg.value, maxAmount);

        session.fulfilled = true;

        // Forward full payment to merchant
        (bool ok,) = session.merchant.call{value: msg.value}("");
        if (!ok) revert NativeTransferFailed();

        emit PaymentReceived(
            sessionId,
            session.merchant,
            msg.sender,
            address(0),
            msg.value,
            session.fiatAmount,
            session.fiatCurrency
        );
    }

    /// @notice Pay a session with an ERC20 token
    /// @param sessionId The session to pay
    /// @param token The ERC20 token address (must match session.tokenAddress)
    function payToken(bytes32 sessionId, address token) external {
        PaymentSession storage session = _getValidSession(sessionId);
        if (session.tokenAddress == address(0)) revert InvalidSession(); // use payNative instead
        if (session.tokenAddress != token) revert InvalidSession();

        (uint256 minAmount, uint256 maxAmount) = _slippageBounds(session.tokenAmount);

        // Pull quoted amount from payer; merchant receives exactly tokenAmount
        // Slippage check is done against expected — payer sends exactly tokenAmount
        // If payer wants to send more/less that's up to their approval amount.
        // We transfer exactly session.tokenAmount and enforce slippage server-side.
        uint256 sendAmount = session.tokenAmount;
        if (sendAmount < minAmount) revert InsufficientAmount(sendAmount, minAmount);
        if (sendAmount > maxAmount) revert ExcessiveAmount(sendAmount, maxAmount);

        session.fulfilled = true;

        bool ok = IERC20(token).transferFrom(msg.sender, session.merchant, sendAmount);
        require(ok, "Token transfer failed");

        emit PaymentReceived(
            sessionId,
            session.merchant,
            msg.sender,
            token,
            sendAmount,
            session.fiatAmount,
            session.fiatCurrency
        );
    }

    /// @notice Get session details
    function getSession(bytes32 sessionId) external view returns (PaymentSession memory) {
        PaymentSession memory session = _sessions[sessionId];
        if (session.merchant == address(0)) revert SessionNotFound();
        return session;
    }

    /// @notice Check if a session is still payable
    function isPayable(bytes32 sessionId) external view returns (bool) {
        PaymentSession memory session = _sessions[sessionId];
        if (session.merchant == address(0)) return false;
        if (session.fulfilled) return false;
        if (block.timestamp >= session.expiry) return false;
        return true;
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    function _getValidSession(bytes32 sessionId) internal view returns (PaymentSession storage) {
        PaymentSession storage session = _sessions[sessionId];
        if (session.merchant == address(0)) revert SessionNotFound();
        if (session.fulfilled) revert SessionAlreadyFulfilled();
        if (block.timestamp >= session.expiry) revert SessionExpiredError();
        return session;
    }

    function _slippageBounds(uint256 amount) internal pure returns (uint256 minAmount, uint256 maxAmount) {
        minAmount = amount * (BPS_DENOM - SLIPPAGE_BPS) / BPS_DENOM;
        maxAmount = amount * (BPS_DENOM + SLIPPAGE_BPS) / BPS_DENOM;
    }

    // ─── Receive ──────────────────────────────────────────────────────────────

    receive() external payable {}
}
