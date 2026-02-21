// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PaymentProcessor.sol";

/// @dev Minimal ERC20 for testing token payments
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    string public name = "MockToken";
    string public symbol = "MTK";
    uint8  public decimals = 18;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "not approved");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract PaymentProcessorTest is Test {
    PaymentProcessor public processor;
    MockERC20 public token;

    address public owner    = address(this);
    address public merchant = makeAddr("merchant");
    address public payer    = makeAddr("payer");

    uint256 constant FIAT_AMOUNT  = 100_00;    // 100.00 AED
    uint256 constant TOKEN_AMOUNT = 1 ether;   // 1 ADI

    bytes3  constant AED = bytes3("AED");
    bytes3  constant USD = bytes3("USD");

    function setUp() public {
        processor = new PaymentProcessor();
        token = new MockERC20();

        // Fund payer
        vm.deal(payer, 10 ether);
        token.mint(payer, 100 ether);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function _makeNativeSession() internal view returns (PaymentProcessor.PaymentSession memory) {
        return PaymentProcessor.PaymentSession({
            sessionId:    keccak256("session-native-1"),
            merchant:     merchant,
            fiatAmount:   FIAT_AMOUNT,
            fiatCurrency: AED,
            tokenAddress: address(0),
            tokenAmount:  TOKEN_AMOUNT,
            expiry:       0, // set by contract
            fulfilled:    false
        });
    }

    function _makeTokenSession(address tok) internal view returns (PaymentProcessor.PaymentSession memory) {
        return PaymentProcessor.PaymentSession({
            sessionId:    keccak256("session-token-1"),
            merchant:     merchant,
            fiatAmount:   FIAT_AMOUNT,
            fiatCurrency: USD,
            tokenAddress: tok,
            tokenAmount:  TOKEN_AMOUNT,
            expiry:       0,
            fulfilled:    false
        });
    }

    // ─── createSession ────────────────────────────────────────────────────────

    function test_CreateSession_Success() public {
        PaymentProcessor.PaymentSession memory params = _makeNativeSession();
        bytes32 id = processor.createSession(params);
        assertEq(id, params.sessionId);

        PaymentProcessor.PaymentSession memory stored = processor.getSession(id);
        assertEq(stored.merchant, merchant);
        assertEq(stored.fiatAmount, FIAT_AMOUNT);
        assertEq(stored.tokenAmount, TOKEN_AMOUNT);
        assertFalse(stored.fulfilled);
        assertGt(stored.expiry, block.timestamp);
    }

    function test_CreateSession_RevertOnDuplicate() public {
        PaymentProcessor.PaymentSession memory params = _makeNativeSession();
        processor.createSession(params);
        vm.expectRevert(PaymentProcessor.InvalidSession.selector);
        processor.createSession(params);
    }

    function test_CreateSession_RevertUnauthorized() public {
        PaymentProcessor.PaymentSession memory params = _makeNativeSession();
        vm.prank(payer);
        vm.expectRevert(PaymentProcessor.Unauthorized.selector);
        processor.createSession(params);
    }

    function test_CreateSession_RevertZeroMerchant() public {
        PaymentProcessor.PaymentSession memory params = _makeNativeSession();
        params.merchant = address(0);
        vm.expectRevert(PaymentProcessor.InvalidSession.selector);
        processor.createSession(params);
    }

    // ─── payNative ────────────────────────────────────────────────────────────

    function test_PayNative_Success() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        uint256 merchantBefore = merchant.balance;

        vm.prank(payer);
        processor.payNative{value: TOKEN_AMOUNT}(id);

        assertEq(merchant.balance, merchantBefore + TOKEN_AMOUNT);
        assertTrue(processor.getSession(id).fulfilled);
    }

    function test_PayNative_WithinSlippage_Low() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        // 2% below
        uint256 minAmount = TOKEN_AMOUNT * 9800 / 10_000;

        vm.prank(payer);
        processor.payNative{value: minAmount}(id);

        assertTrue(processor.getSession(id).fulfilled);
    }

    function test_PayNative_WithinSlippage_High() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        // 2% above
        uint256 maxAmount = TOKEN_AMOUNT * 10_200 / 10_000;
        vm.deal(payer, maxAmount + 1 ether);

        vm.prank(payer);
        processor.payNative{value: maxAmount}(id);

        assertTrue(processor.getSession(id).fulfilled);
    }

    function test_PayNative_RevertInsufficientAmount() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        uint256 tooLow = TOKEN_AMOUNT * 9700 / 10_000; // 3% below

        vm.prank(payer);
        vm.expectRevert(
            abi.encodeWithSelector(
                PaymentProcessor.InsufficientAmount.selector,
                tooLow,
                TOKEN_AMOUNT * 9800 / 10_000
            )
        );
        processor.payNative{value: tooLow}(id);
    }

    function test_PayNative_RevertExcessiveAmount() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        uint256 tooHigh = TOKEN_AMOUNT * 10_300 / 10_000; // 3% above
        vm.deal(payer, tooHigh + 1 ether);

        vm.prank(payer);
        vm.expectRevert(
            abi.encodeWithSelector(
                PaymentProcessor.ExcessiveAmount.selector,
                tooHigh,
                TOKEN_AMOUNT * 10_200 / 10_000
            )
        );
        processor.payNative{value: tooHigh}(id);
    }

    function test_PayNative_RevertExpired() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        vm.warp(block.timestamp + 16 minutes);

        vm.prank(payer);
        vm.expectRevert(PaymentProcessor.SessionExpiredError.selector);
        processor.payNative{value: TOKEN_AMOUNT}(id);
    }

    function test_PayNative_RevertAlreadyFulfilled() public {
        bytes32 id = processor.createSession(_makeNativeSession());

        vm.prank(payer);
        processor.payNative{value: TOKEN_AMOUNT}(id);

        vm.prank(payer);
        vm.expectRevert(PaymentProcessor.SessionAlreadyFulfilled.selector);
        processor.payNative{value: TOKEN_AMOUNT}(id);
    }

    // ─── payToken ─────────────────────────────────────────────────────────────

    function test_PayToken_Success() public {
        bytes32 id = processor.createSession(_makeTokenSession(address(token)));
        uint256 merchantBefore = token.balanceOf(merchant);

        vm.startPrank(payer);
        token.approve(address(processor), TOKEN_AMOUNT);
        processor.payToken(id, address(token));
        vm.stopPrank();

        assertEq(token.balanceOf(merchant), merchantBefore + TOKEN_AMOUNT);
        assertEq(token.balanceOf(payer), 100 ether - TOKEN_AMOUNT);
        assertTrue(processor.getSession(id).fulfilled);
    }

    function test_PayToken_RevertWrongToken() public {
        bytes32 id = processor.createSession(_makeTokenSession(address(token)));
        address fakeToken = makeAddr("fakeToken");

        vm.prank(payer);
        vm.expectRevert(PaymentProcessor.InvalidSession.selector);
        processor.payToken(id, fakeToken);
    }

    function test_PayToken_RevertExpired() public {
        bytes32 id = processor.createSession(_makeTokenSession(address(token)));
        vm.warp(block.timestamp + 16 minutes);

        vm.startPrank(payer);
        token.approve(address(processor), TOKEN_AMOUNT);
        vm.expectRevert(PaymentProcessor.SessionExpiredError.selector);
        processor.payToken(id, address(token));
        vm.stopPrank();
    }

    // ─── isPayable ────────────────────────────────────────────────────────────

    function test_IsPayable_True() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        assertTrue(processor.isPayable(id));
    }

    function test_IsPayable_FalseAfterExpiry() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        vm.warp(block.timestamp + 16 minutes);
        assertFalse(processor.isPayable(id));
    }

    function test_IsPayable_FalseAfterFulfilled() public {
        bytes32 id = processor.createSession(_makeNativeSession());
        vm.prank(payer);
        processor.payNative{value: TOKEN_AMOUNT}(id);
        assertFalse(processor.isPayable(id));
    }

    function test_IsPayable_FalseForUnknownSession() public {
        assertFalse(processor.isPayable(keccak256("nonexistent")));
    }

    // ─── Authorization ────────────────────────────────────────────────────────

    function test_SetCreatorAuthorized() public {
        address newCreator = makeAddr("creator");
        processor.setCreatorAuthorized(newCreator, true);
        assertTrue(processor.authorizedCreators(newCreator));

        // newCreator can now create sessions
        PaymentProcessor.PaymentSession memory params = _makeNativeSession();
        vm.prank(newCreator);
        processor.createSession(params);
    }

    function test_RevokeCreatorAuthorized() public {
        address newCreator = makeAddr("creator");
        processor.setCreatorAuthorized(newCreator, true);
        processor.setCreatorAuthorized(newCreator, false);

        PaymentProcessor.PaymentSession memory params = _makeNativeSession();
        vm.prank(newCreator);
        vm.expectRevert(PaymentProcessor.Unauthorized.selector);
        processor.createSession(params);
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    function test_EmitsPaymentReceived() public {
        bytes32 id = processor.createSession(_makeNativeSession());

        vm.expectEmit(true, true, true, true);
        emit PaymentProcessor.PaymentReceived(
            id,
            merchant,
            payer,
            address(0),
            TOKEN_AMOUNT,
            FIAT_AMOUNT,
            AED
        );

        vm.prank(payer);
        processor.payNative{value: TOKEN_AMOUNT}(id);
    }

    function test_EmitsSessionCreated() public {
        PaymentProcessor.PaymentSession memory params = _makeNativeSession();

        vm.expectEmit(true, true, false, false);
        emit PaymentProcessor.SessionCreated(
            params.sessionId,
            merchant,
            FIAT_AMOUNT,
            AED,
            address(0),
            TOKEN_AMOUNT,
            0 // expiry set by contract, not checked here
        );

        processor.createSession(params);
    }
}
