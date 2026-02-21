import { useState, useEffect, useCallback } from "react";
import { useAccount, useDisconnect, useSendTransaction, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
export interface WidgetOptions {
  sessionId: string;
  apiUrl: string;
  projectId?: string;
  theme?: "light" | "dark";
  onSuccess?: (txHash: string) => void;
  onFailure?: (err: Error) => void;
}
interface CartItem {
  name: string;
  description?: string;
  imageUrl?: string;
  unitPrice: string;
}
interface SessionData {
  id: string;
  fiatAmount: number;
  fiatCurrency: string;
  fiatAmountFormatted: string;
  tokenSymbol: string;
  tokenAmount: string;
  tokenAmountFormatted: string;
  status: string;
  txHash: string | null;
  expiresAt: number;
  secondsRemaining: number;
  contractAddress: string;
  chainId: number;
  qrCode?: string;
  items?: CartItem[];
}
type WidgetState =
  | "loading"
  | "awaiting_wallet"
  | "confirm_tx"
  | "pending"
  | "confirmed"
  | "failed"
  | "expired";
const PAY_NATIVE_SELECTOR = "0xefc3d609";
function encodePayNative(sessionId: string): `0x${string}` {
  const sid = sessionId.startsWith("0x") ? sessionId.slice(2) : sessionId;
  return (PAY_NATIVE_SELECTOR + sid.padStart(64, "0")) as `0x${string}`;
}
export function AdiPayCheckout({ sessionId, apiUrl, onSuccess, onFailure }: WidgetOptions) {
  const BLUE = "#003cff";
  const BLUE_BG = "rgba(0,60,255,0.05)";
  const BLUE_BORDER = "rgba(0,60,255,0.1)";
  const [session, setSession] = useState<SessionData | null>(null);
  const [widgetState, setWidgetState] = useState<WidgetState>("loading");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { sendTransaction, isPending: isSending } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  useEffect(() => {
    fetch(`${apiUrl}/payments/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SessionData>;
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
    if (widgetState !== "awaiting_wallet" && widgetState !== "confirm_tx") return;
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
    if (widgetState !== "pending") return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${apiUrl}/payments/sessions/${sessionId}`);
        const data: SessionData = await r.json();
        if (data.status === "confirmed") {
          setSession(data);
          setWidgetState("confirmed");
          onSuccess?.(data.txHash ?? "");
          clearInterval(poll);
        } else if (data.status === "expired" || data.secondsRemaining <= 0) {
          setWidgetState("expired");
          clearInterval(poll);
        }
      } catch {
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [widgetState, sessionId, apiUrl, onSuccess]);
  const sendPayment = useCallback(async () => {
    if (!session || !address) return;
    if (chainId !== session.chainId) {
      try {
        await switchChain({ chainId: session.chainId });
      } catch {
      }
    }
    setWidgetState("pending");
    sendTransaction(
      {
        to: session.contractAddress as `0x${string}`,
        value: BigInt(session.tokenAmount),
        data: encodePayNative(session.id),
      },
      {
        onError: (err) => {
          setWidgetState("confirm_tx");
          onFailure?.(err);
        },
      },
    );
  }, [session, address, chainId, switchChain, sendTransaction, onFailure]);
  const widget: React.CSSProperties = {
    background: "#fff",
    borderRadius: 10,
    maxWidth: 408,
    margin: "0 auto",
    fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    overflow: "hidden",
    border: "1px solid #eee",
  };
  const Header = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 15, padding: "30px 34px 20px" }}>
        <div
          style={{
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
          }}
        >
          ADI
        </div>
        <div>
          <div style={{ fontSize: 17.46, fontWeight: 400, color: "#000", letterSpacing: -0.17, lineHeight: 1.3 }}>
            Check out with ADI
          </div>
          <div style={{ fontSize: 11.64, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, lineHeight: 1.4, maxWidth: 225 }}>
            Accept crypto payments, priced in fiat.
          </div>
        </div>
      </div>
      <div style={{ height: 0.5, background: "rgba(0,0,0,0.1)" }} />
    </>
  );
  if (widgetState === "loading") {
    return (
      <div style={widget}>
        <Header />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 34px", gap: 16 }}>
          <SpinnerSVG color={BLUE} />
          <span style={{ fontSize: 16, color: BLUE, letterSpacing: -0.16 }}>Processing</span>
        </div>
      </div>
    );
  }
  if (widgetState === "confirmed") {
    const tokenAmt = session ? `${(Number(BigInt(session.tokenAmount)) / 1e18).toFixed(2)} ${session.tokenSymbol}` : "-";
    const tokenNum = session ? (Number(BigInt(session.tokenAmount)) / 1e18).toFixed(2) : "0";
    const txHash = session?.txHash ?? "";
    const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return (
      <div style={widget}>
        <Header />
        <div style={{ padding: "24px 34px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke={BLUE} strokeWidth="1.5" />
              <path d="M8 12l3 3 5-5" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 18, color: BLUE, fontWeight: 400, letterSpacing: -0.18 }}>Success!</span>
          </div>
          <div style={{ fontSize: 39, fontWeight: 400, color: "#000", letterSpacing: -0.39, marginBottom: 20 }}>{tokenAmt}</div>
          <div style={{ height: 0.5, background: "rgba(0,0,0,0.1)", marginBottom: 16 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, fontSize: 12, letterSpacing: -0.12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#000" }}>Subtotal</span>
              <span style={{ fontWeight: 700, color: BLUE }}>{session?.fiatAmountFormatted} {session?.fiatCurrency}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#000" }}>Token</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "rgba(0,0,0,0.5)" }}>{session?.fiatAmountFormatted}</span>
                <span style={{ color: "#000" }}>{tokenNum} {session?.tokenSymbol}</span>
              </div>
            </div>
          </div>
          <div style={{ height: 0.5, background: "rgba(0,0,0,0.1)", marginBottom: 16 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, fontSize: 12, letterSpacing: -0.12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(0,0,0,0.5)" }}>Total</span>
              <span style={{ color: BLUE }}>{tokenAmt}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(0,0,0,0.5)" }}>Date</span>
              <span style={{ color: "rgba(0,0,0,0.5)" }}>{dateStr}</span>
            </div>
          </div>
          <button style={{ ...btnStyle(BLUE), marginBottom: 16 }} onClick={() => txHash && window.open(`https://explorer.ab.testnet.adifoundation.ai/tx/${txHash}`, "_blank")}>
            View transaction
          </button>
          <div style={{ textAlign: "center" }}>
            <button
              style={{ background: "none", border: "none", fontSize: 16, color: BLUE, letterSpacing: -0.16, cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => setWidgetState("awaiting_wallet")}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (widgetState === "failed") {
    return (
      <div style={widget}>
        <Header />
        <div style={{ padding: "60px 34px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✗</div>
          <div style={{ fontSize: 18, color: "#000", marginBottom: 8, letterSpacing: -0.18 }}>Payment Failed</div>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", marginBottom: 24 }}>The transaction was rejected or failed.</div>
          <button style={btnStyle(BLUE)} onClick={() => setWidgetState("awaiting_wallet")}>Try Again</button>
        </div>
      </div>
    );
  }
  if (widgetState === "expired") {
    return (
      <div style={widget}>
        <Header />
        <div style={{ padding: "60px 34px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <div style={{ fontSize: 18, color: "#000", marginBottom: 8, letterSpacing: -0.18 }}>Session Expired</div>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)" }}>This payment session has expired. Please request a new one.</div>
        </div>
      </div>
    );
  }
  if (widgetState === "awaiting_wallet") {
    return (
      <div style={widget}>
        <Header />
        <div style={{ padding: "16px 0 24px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ background: BLUE_BG, borderRadius: 5, padding: "8px 13px", fontSize: 9.3, color: BLUE, opacity: 0.8, letterSpacing: -0.09 }}>
              Scan the QR code with a compatible wallet
            </div>
          </div>
          {session?.qrCode && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, padding: "0 34px" }}>
              <img src={session.qrCode} alt="Payment QR" style={{ width: 299, height: 299, display: "block" }} />
            </div>
          )}
          <div style={{ padding: "0 45px" }}>
            <button style={{ ...btnStyle(BLUE), display: "flex", alignItems: "center", justifyContent: "center", gap: 15 }} onClick={() => openConnectModal?.()}>
              <WalletIcon />
              Connect wallet
            </button>
          </div>
        </div>
      </div>
    );
  }
  const isProcessing = widgetState === "pending";
  const short = address ? `${address.slice(0, 6)}....${address.slice(-4)}` : "0x0000....0000";
  const tokenNum = session ? (Number(BigInt(session.tokenAmount)) / 1e18).toFixed(2) : "0";
  const items = session?.items ?? [];
  return (
    <div style={widget}>
      <Header />
      <div style={{ padding: "16px 0 0" }}>
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", padding: "0 34px", marginBottom: 16, gap: 16 }}>
              <div
                style={{
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
                }}
              >
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (item.name?.[0] ?? "I")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, marginBottom: 4 }}>{item.description ?? "Item"}</div>
                <div style={{ fontSize: 12, color: "#000", letterSpacing: -0.12 }}>{item.name}</div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, flexShrink: 0 }}>{item.unitPrice}</div>
            </div>
          ))
        ) : (
          <div style={{ padding: "0 34px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", letterSpacing: -0.12, marginBottom: 4 }}>Order total</div>
            <div style={{ fontSize: 12, color: "#000", letterSpacing: -0.12 }}>{session?.fiatAmountFormatted} {session?.fiatCurrency}</div>
          </div>
        )}
        <div style={{ height: 0.5, background: "rgba(0,0,0,0.1)", margin: "0 34px 16px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 34px", marginBottom: 16, fontSize: 12, letterSpacing: -0.12 }}>
          <span style={{ color: "#000" }}>Subtotal</span>
          <span style={{ fontWeight: 700, color: BLUE }}>{session?.fiatAmountFormatted} {session?.fiatCurrency}</span>
        </div>
        <div style={{ margin: "0 8px 0", background: BLUE_BG, border: `1px solid ${BLUE_BORDER}`, borderRadius: 6, padding: "22px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 39, fontWeight: 400, color: "#000", letterSpacing: -0.39, lineHeight: 1 }}>{tokenNum}</div>
              <div style={{ fontSize: 9.3, color: "rgba(0,0,0,0.5)", letterSpacing: -0.09, marginTop: 6 }}>{session?.fiatAmountFormatted}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${BLUE_BORDER}`, borderRadius: 10, padding: "8px 12px", height: 41 }}>
              <AdiLogo />
              <span style={{ fontSize: 14, color: "#000", letterSpacing: -0.14 }}>ADI</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
          <button
            style={{
              ...btnStyle(BLUE),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: isProcessing || isSending ? 0.5 : 1,
              cursor: isProcessing || isSending ? "not-allowed" : "pointer",
              marginBottom: 12,
            }}
            disabled={isProcessing || isSending}
            onClick={sendPayment}
          >
            {isProcessing || isSending ? (
              <>
                <SpinnerSVG color="#fff" size={20} />
                <span style={{ opacity: 0.5 }}>Processing</span>
              </>
            ) : (
              <>
                <span style={{ opacity: 0.7 }}>{tokenNum} ADI -</span>
                <span>Check out</span>
              </>
            )}
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 9.3, letterSpacing: -0.09 }}>
            <span style={{ color: "rgba(0,0,0,0.5)", opacity: 0.5 }}>{short}</span>
            <button
              style={{ background: "none", border: "none", color: BLUE, fontSize: 9.3, letterSpacing: -0.09, cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit" }}
              onClick={() => {
                disconnect();
                setWidgetState("awaiting_wallet");
              }}
            >
              Change wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function btnStyle(color: string): React.CSSProperties {
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
function SpinnerSVG({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <>
      <style>{`@keyframes adipay-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: size,
          height: size,
          border: `2px solid ${color}44`,
          borderTopColor: color,
          borderRadius: "50%",
          animation: "adipay-spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
    </>
  );
}
function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M21 7H3C2.44772 7 2 7.44772 2 8V19C2 19.5523 2.44772 20 3 20H21C21.5523 20 22 19.5523 22 19V8C22 7.44772 21.5523 7 21 7Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 14C16 14.5523 16.4477 15 17 15C17.5523 15 18 14.5523 18 14C18 13.4477 17.5523 13 17 13C16.4477 13 16 13.4477 16 14Z" fill="white" />
      <path d="M2 10H22M7 7V5C7 4.44772 7.44772 4 8 4H16C16.5523 4 17 4.44772 17 5V7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function AdiLogo() {
  return (
    <svg width="13" height="18" viewBox="0 0 13 18" fill="none">
      <polygon points="6.5,0 13,9 6.5,18 0,9" fill="#003cff" opacity="0.9" />
      <polygon points="6.5,4 10,9 6.5,14 3,9" fill="#f97316" />
    </svg>
  );
}
