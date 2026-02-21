import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useAccount, useDisconnect, useSendTransaction, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
const PAY_NATIVE_SELECTOR = "0xefc3d609";
function encodePayNative(sessionId) {
    const sid = sessionId.startsWith("0x") ? sessionId.slice(2) : sessionId;
    return (PAY_NATIVE_SELECTOR + sid.padStart(64, "0"));
}
export function AdiPayCheckout({ sessionId, apiUrl, onSuccess, onFailure }) {
    const BLUE = "#003cff";
    const BLUE_BG = "rgba(0,60,255,0.05)";
    const BLUE_BORDER = "rgba(0,60,255,0.1)";
    const [session, setSession] = useState(null);
    const [widgetState, setWidgetState] = useState("loading");
    const [secondsRemaining, setSecondsRemaining] = useState(0);
    const { address, isConnected, chainId } = useAccount();
    const { disconnect } = useDisconnect();
    const { openConnectModal } = useConnectModal();
    const { sendTransaction, isPending: isSending } = useSendTransaction();
    const { switchChain } = useSwitchChain();
    useEffect(() => {
        fetch(`${apiUrl}/payments/sessions/${sessionId}`)
            .then((r) => {
            if (!r.ok)
                throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
            .then((data) => {
            setSession(data);
            if (data.status === "confirmed") {
                setWidgetState("confirmed");
                return;
            }
            if (data.status === "expired" || data.secondsRemaining <= 0) {
                setWidgetState("expired");
                return;
            }
            if (data.status === "failed") {
                setWidgetState("failed");
                return;
            }
            setSecondsRemaining(data.secondsRemaining);
            setWidgetState("awaiting_wallet");
        })
            .catch(() => setWidgetState("failed"));
    }, [sessionId, apiUrl]);
    useEffect(() => {
        if (isConnected && widgetState === "awaiting_wallet") {
            setWidgetState("confirm_tx");
        }
    }, [isConnected, widgetState]);
    useEffect(() => {
        if (widgetState !== "awaiting_wallet" && widgetState !== "confirm_tx")
            return;
        const timer = setInterval(() => {
            setSecondsRemaining((s) => {
                if (s <= 1) {
                    setWidgetState("expired");
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [widgetState]);
    useEffect(() => {
        if (widgetState !== "pending")
            return;
        const poll = setInterval(async () => {
            try {
                const r = await fetch(`${apiUrl}/payments/sessions/${sessionId}`);
                const data = await r.json();
                if (data.status === "confirmed") {
                    setSession(data);
                    setWidgetState("confirmed");
                    onSuccess?.(data.txHash ?? "");
                    clearInterval(poll);
                }
                else if (data.status === "expired" || data.secondsRemaining <= 0) {
                    setWidgetState("expired");
                    clearInterval(poll);
                }
            }
            catch {
            }
        }, 3000);
        return () => clearInterval(poll);
    }, [widgetState, sessionId, apiUrl, onSuccess]);
    const sendPayment = useCallback(async () => {
        if (!session || !address)
            return;
        if (chainId !== session.chainId) {
            try {
                await switchChain({ chainId: session.chainId });
            }
            catch {
            }
        }
        setWidgetState("pending");
        sendTransaction({
            to: session.contractAddress,
            value: BigInt(session.tokenAmount),
            data: encodePayNative(session.id),
        }, {
            onError: (err) => {
                setWidgetState("confirm_tx");
                onFailure?.(err);
            },
        });
    }, [session, address, chainId, switchChain, sendTransaction, onFailure]);
    const widget = {
        background: "#fff",
        borderRadius: 10,
        maxWidth: 408,
        margin: "0 auto",
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
        border: "1px solid #eee",
    };
    const Header = () => (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 15, padding: "30px 34px 20px" }, children: [_jsx("div", { style: {
                            width: 42,
                            height: 42,
                            background: BLUE,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            letterSpacing: "0.08em",
                            fontWeight: 500,
                            flexShrink: 0,
                        }, children: "ADI" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 17.46, fontWeight: 400, color: "#000", letterSpacing: -0.17, lineHeight: 1.3 }, children: "Check out with ADI" }), _jsx("div", { style: { fontSize: 11.64, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, lineHeight: 1.4, maxWidth: 225 }, children: "Accept crypto payments, priced in fiat." })] })] }), _jsx("div", { style: { height: 0.5, background: "rgba(0,0,0,0.1)" } })] }));
    if (widgetState === "loading") {
        return (_jsxs("div", { style: widget, children: [_jsx(Header, {}), _jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 34px", gap: 16 }, children: [_jsx(SpinnerSVG, { color: BLUE }), _jsx("span", { style: { fontSize: 16, color: BLUE, letterSpacing: -0.16 }, children: "Processing" })] })] }));
    }
    if (widgetState === "confirmed") {
        const tokenAmt = session ? `${(Number(BigInt(session.tokenAmount)) / 1e18).toFixed(2)} ${session.tokenSymbol}` : "-";
        const tokenNum = session ? (Number(BigInt(session.tokenAmount)) / 1e18).toFixed(2) : "0";
        const txHash = session?.txHash ?? "";
        const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        return (_jsxs("div", { style: widget, children: [_jsx(Header, {}), _jsxs("div", { style: { padding: "24px 34px 32px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }, children: [_jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "12", cy: "12", r: "10", stroke: BLUE, strokeWidth: "1.5" }), _jsx("path", { d: "M8 12l3 3 5-5", stroke: BLUE, strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })] }), _jsx("span", { style: { fontSize: 18, color: BLUE, fontWeight: 400, letterSpacing: -0.18 }, children: "Success!" })] }), _jsx("div", { style: { fontSize: 39, fontWeight: 400, color: "#000", letterSpacing: -0.39, marginBottom: 20 }, children: tokenAmt }), _jsx("div", { style: { height: 0.5, background: "rgba(0,0,0,0.1)", marginBottom: 16 } }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, fontSize: 12, letterSpacing: -0.12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { color: "#000" }, children: "Subtotal" }), _jsxs("span", { style: { fontWeight: 700, color: BLUE }, children: [session?.fiatAmountFormatted, " ", session?.fiatCurrency] })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { color: "#000" }, children: "Token" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("span", { style: { color: "rgba(0,0,0,0.5)" }, children: session?.fiatAmountFormatted }), _jsxs("span", { style: { color: "#000" }, children: [tokenNum, " ", session?.tokenSymbol] })] })] })] }), _jsx("div", { style: { height: 0.5, background: "rgba(0,0,0,0.1)", marginBottom: 16 } }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, fontSize: 12, letterSpacing: -0.12 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { color: "rgba(0,0,0,0.5)" }, children: "Total" }), _jsx("span", { style: { color: BLUE }, children: tokenAmt })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("span", { style: { color: "rgba(0,0,0,0.5)" }, children: "Date" }), _jsx("span", { style: { color: "rgba(0,0,0,0.5)" }, children: dateStr })] })] }), _jsx("button", { style: { ...btnStyle(BLUE), marginBottom: 16 }, onClick: () => txHash && window.open(`https://explorer.ab.testnet.adifoundation.ai/tx/${txHash}`, "_blank"), children: "View transaction" }), _jsx("div", { style: { textAlign: "center" }, children: _jsx("button", { style: { background: "none", border: "none", fontSize: 16, color: BLUE, letterSpacing: -0.16, cursor: "pointer", fontFamily: "inherit" }, onClick: () => setWidgetState("awaiting_wallet"), children: "Go back" }) })] })] }));
    }
    if (widgetState === "failed") {
        return (_jsxs("div", { style: widget, children: [_jsx(Header, {}), _jsxs("div", { style: { padding: "60px 34px 32px", textAlign: "center" }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: "\u2717" }), _jsx("div", { style: { fontSize: 18, color: "#000", marginBottom: 8, letterSpacing: -0.18 }, children: "Payment Failed" }), _jsx("div", { style: { fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 24 }, children: "The transaction was rejected or failed." }), _jsx("button", { style: btnStyle(BLUE), onClick: () => setWidgetState("awaiting_wallet"), children: "Try Again" })] })] }));
    }
    if (widgetState === "expired") {
        return (_jsxs("div", { style: widget, children: [_jsx(Header, {}), _jsxs("div", { style: { padding: "60px 34px 32px", textAlign: "center" }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: "\u23F0" }), _jsx("div", { style: { fontSize: 18, color: "#000", marginBottom: 8, letterSpacing: -0.18 }, children: "Session Expired" }), _jsx("div", { style: { fontSize: 12, color: "rgba(0,0,0,0.5)" }, children: "This payment session has expired. Please request a new one." })] })] }));
    }
    if (widgetState === "awaiting_wallet") {
        return (_jsxs("div", { style: widget, children: [_jsx(Header, {}), _jsxs("div", { style: { padding: "16px 0 24px" }, children: [_jsx("div", { style: { display: "flex", justifyContent: "center", marginBottom: 16 }, children: _jsx("div", { style: { background: BLUE_BG, borderRadius: 5, padding: "8px 13px", fontSize: 9.3, color: BLUE, opacity: 0.8, letterSpacing: -0.09 }, children: "Scan the QR code with a compatible wallet" }) }), session?.qrCode && (_jsx("div", { style: { display: "flex", justifyContent: "center", marginBottom: 20, padding: "0 34px" }, children: _jsx("img", { src: session.qrCode, alt: "Payment QR", style: { width: 299, height: 299, display: "block" } }) })), _jsx("div", { style: { padding: "0 45px" }, children: _jsxs("button", { style: { ...btnStyle(BLUE), display: "flex", alignItems: "center", justifyContent: "center", gap: 15 }, onClick: () => openConnectModal?.(), children: [_jsx(WalletIcon, {}), "Connect wallet"] }) })] })] }));
    }
    const isProcessing = widgetState === "pending";
    const short = address ? `${address.slice(0, 6)}....${address.slice(-4)}` : "0x0000....0000";
    const tokenNum = session ? (Number(BigInt(session.tokenAmount)) / 1e18).toFixed(2) : "0";
    const items = session?.items ?? [];
    return (_jsxs("div", { style: widget, children: [_jsx(Header, {}), _jsxs("div", { style: { padding: "16px 0 0" }, children: [items.length > 0 ? (items.map((item, i) => (_jsxs("div", { style: { display: "flex", alignItems: "flex-start", padding: "0 34px", marginBottom: 16, gap: 16 }, children: [_jsx("div", { style: {
                                    width: 65,
                                    height: 65,
                                    borderRadius: 4,
                                    flexShrink: 0,
                                    overflow: "hidden",
                                    background: item.imageUrl ? "#f2f2f2" : BLUE_BG,
                                    border: item.imageUrl ? "none" : `1px solid ${BLUE_BORDER}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: BLUE,
                                    fontWeight: 600,
                                    fontSize: 18,
                                }, children: item.imageUrl ? _jsx("img", { src: item.imageUrl, alt: item.name, style: { width: "100%", height: "100%", objectFit: "cover" } }) : (item.name?.[0] ?? "I") }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: 12, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, marginBottom: 4 }, children: item.description ?? "Item" }), _jsx("div", { style: { fontSize: 12, color: "#000", letterSpacing: -0.12 }, children: item.name })] }), _jsx("div", { style: { fontSize: 12, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, flexShrink: 0 }, children: item.unitPrice })] }, i)))) : (_jsxs("div", { style: { padding: "0 34px", marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 12, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, marginBottom: 4 }, children: "Order total" }), _jsxs("div", { style: { fontSize: 12, color: "#000", letterSpacing: -0.12 }, children: [session?.fiatAmountFormatted, " ", session?.fiatCurrency] })] })), _jsx("div", { style: { height: 0.5, background: "rgba(0,0,0,0.1)", margin: "0 34px 16px" } }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "0 34px", marginBottom: 16, fontSize: 12, letterSpacing: -0.12 }, children: [_jsx("span", { style: { color: "#000" }, children: "Subtotal" }), _jsxs("span", { style: { fontWeight: 700, color: BLUE }, children: [session?.fiatAmountFormatted, " ", session?.fiatCurrency] })] }), _jsxs("div", { style: { margin: "0 8px 0", background: BLUE_BG, border: `1px solid ${BLUE_BORDER}`, borderRadius: 6, padding: "22px 20px 16px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 39, fontWeight: 400, color: "#000", letterSpacing: -0.39, lineHeight: 1 }, children: tokenNum }), _jsx("div", { style: { fontSize: 9.3, color: "rgba(0,0,0,0.5)", letterSpacing: -0.09, marginTop: 6 }, children: session?.fiatAmountFormatted })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${BLUE_BORDER}`, borderRadius: 10, padding: "8px 12px", height: 41 }, children: [_jsx(AdiLogo, {}), _jsx("span", { style: { fontSize: 14, color: "#000", letterSpacing: -0.14 }, children: "ADI" }), _jsx("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M9 18l6-6-6-6", stroke: "#000", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })] })] }), _jsx("button", { style: {
                                    ...btnStyle(BLUE),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 12,
                                    opacity: isProcessing || isSending ? 0.5 : 1,
                                    cursor: isProcessing || isSending ? "not-allowed" : "pointer",
                                    marginBottom: 12,
                                }, disabled: isProcessing || isSending, onClick: sendPayment, children: isProcessing || isSending ? (_jsxs(_Fragment, { children: [_jsx(SpinnerSVG, { color: "#fff", size: 20 }), _jsx("span", { style: { opacity: 0.5 }, children: "Processing" })] })) : (_jsxs(_Fragment, { children: [_jsxs("span", { style: { opacity: 0.7 }, children: [tokenNum, " ADI -"] }), _jsx("span", { children: "Check out" })] })) }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", fontSize: 9.3, letterSpacing: -0.09 }, children: [_jsx("span", { style: { color: "rgba(0,0,0,0.5)", opacity: 0.5 }, children: short }), _jsx("button", { style: { background: "none", border: "none", color: BLUE, fontSize: 9.3, letterSpacing: -0.09, cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit" }, onClick: () => {
                                            disconnect();
                                            setWidgetState("awaiting_wallet");
                                        }, children: "Change wallet" })] })] })] })] }));
}
function btnStyle(color) {
    return {
        display: "block",
        width: "100%",
        height: 50,
        border: `1px solid ${color}`,
        borderRadius: 4,
        fontSize: 16,
        fontWeight: 400,
        cursor: "pointer",
        background: color,
        color: "#fff",
        letterSpacing: -0.16,
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: "border-box",
    };
}
function SpinnerSVG({ color, size = 24 }) {
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `@keyframes adipay-spin { to { transform: rotate(360deg); } }` }), _jsx("div", { style: {
                    width: size,
                    height: size,
                    border: `2px solid ${color}44`,
                    borderTopColor: color,
                    borderRadius: "50%",
                    animation: "adipay-spin 0.8s linear infinite",
                    flexShrink: 0,
                } })] }));
}
function WalletIcon() {
    return (_jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", style: { flexShrink: 0 }, children: [_jsx("path", { d: "M21 7H3C2.44772 7 2 7.44772 2 8V19C2 19.5523 2.44772 20 3 20H21C21.5523 20 22 19.5523 22 19V8C22 7.44772 21.5523 7 21 7Z", stroke: "white", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M16 14C16 14.5523 16.4477 15 17 15C17.5523 15 18 14.5523 18 14C18 13.4477 17.5523 13 17 13C16.4477 13 16 13.4477 16 14Z", fill: "white" }), _jsx("path", { d: "M2 10H22M7 7V5C7 4.44772 7.44772 4 8 4H16C16.5523 4 17 4.44772 17 5V7", stroke: "white", strokeWidth: "1.5", strokeLinecap: "round" })] }));
}
function AdiLogo() {
    return (_jsxs("svg", { width: "13", height: "18", viewBox: "0 0 13 18", fill: "none", children: [_jsx("polygon", { points: "6.5,0 13,9 6.5,18 0,9", fill: "#003cff", opacity: "0.9" }), _jsx("polygon", { points: "6.5,4 10,9 6.5,14 3,9", fill: "#f97316" })] }));
}
//# sourceMappingURL=AdiPayCheckout.js.map