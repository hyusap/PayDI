/**
 * AdiPay Checkout Widget
 * Embeddable vanilla-TS widget for accepting ADI payments.
 *
 * Usage:
 *   AdiPay.mount('#checkout', { sessionId, apiUrl, onSuccess, onFailure });
 */

import { createAppKit } from "@reown/appkit";
import type { AppKit, AppKitNetwork } from "@reown/appkit";

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetState =
  | "loading"
  | "awaiting_wallet"
  | "confirm_tx"
  | "pending"
  | "confirmed"
  | "failed"
  | "expired";

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
  qrCode?: string;
  eip681Uri?: string;
  items?: CartItem[];
}

interface WidgetOptions {
  sessionId: string;
  apiUrl: string;
  projectId?: string;
  onSuccess?: (txHash: string) => void;
  onFailure?: (err: Error) => void;
  theme?: "light" | "dark";
}

declare global {
  interface Window {
    AdiPay: typeof AdiPay;
  }
}

// ─── Chain definitions ────────────────────────────────────────────────────────

const adiTestnet: AppKitNetwork = {
  id: 99999,
  caipNetworkId: "eip155:99999",
  chainNamespace: "eip155",
  name: "ADI Chain Testnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ab.testnet.adifoundation.ai/"] } },
  blockExplorers: {
    default: { name: "ADI Explorer", url: "https://explorer.ab.testnet.adifoundation.ai" },
  },
};

const adiMainnet: AppKitNetwork = {
  id: 36900,
  caipNetworkId: "eip155:36900",
  chainNamespace: "eip155",
  name: "ADI Chain Mainnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.adifoundation.ai/"] } },
  blockExplorers: {
    default: { name: "ADI Explorer", url: "https://explorer.adifoundation.ai" },
  },
};

const DEFAULT_PROJECT_ID = "13023ac06bb20e4b24b1dd3cc0d248bb";

// ─── AppKit singleton ─────────────────────────────────────────────────────────

let _appkit: AppKit | null = null;

function getAppKit(projectId: string): AppKit {
  if (_appkit) return _appkit;
  _appkit = createAppKit({
    projectId,
    networks: [adiTestnet, adiMainnet],
    defaultNetwork: adiTestnet,
    metadata: {
      name: "AdiPay",
      description: "Checkout with ADI Chain",
      url: typeof window !== "undefined" ? window.location.origin : "",
      icons: [],
    },
    features: { email: false, socials: false, onramp: false },
  });
  return _appkit;
}

// ─── PayNative calldata ───────────────────────────────────────────────────────

const PAY_NATIVE_SELECTOR = "0xb5da5b4b";

function encodePayNative(sessionId: string): string {
  const sid = sessionId.startsWith("0x") ? sessionId.slice(2) : sessionId;
  return PAY_NATIVE_SELECTOR + sid.padStart(64, "0");
}

// ─── Widget class ─────────────────────────────────────────────────────────────

class AdiPayWidget {
  private container: Element;
  private options: WidgetOptions;
  private state: WidgetState = "loading";
  private session: SessionData | null = null;
  private walletAddress: string | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private secondsRemaining = 0;
  private unsubscribeAccount: (() => void) | null = null;

  // Design tokens
  private readonly BLUE = "#003cff";
  private readonly BLUE_BG = "rgba(0,60,255,0.05)";
  private readonly BLUE_BORDER = "rgba(0,60,255,0.1)";
  private readonly FONT = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  constructor(container: Element, options: WidgetOptions) {
    this.container = container;
    this.options = options;
    this.init();
  }

  private async init() {
    this.render();
    await this.loadSession();
  }

  private setState(state: WidgetState) {
    this.state = state;
    this.render();
  }

  private async loadSession() {
    try {
      const res = await fetch(
        `${this.options.apiUrl}/payments/sessions/${this.options.sessionId}`
      );
      if (!res.ok) throw new Error(`Failed to load session: ${res.status}`);
      this.session = await res.json();

      if (this.session!.status === "confirmed") { this.setState("confirmed"); return; }
      if (this.session!.status === "expired") { this.setState("expired"); return; }
      if (this.session!.status === "failed") { this.setState("failed"); return; }

      this.secondsRemaining = this.session!.secondsRemaining;
      if (this.secondsRemaining <= 0) { this.setState("expired"); return; }

      this.startCountdown();

      const kit = getAppKit(this.options.projectId ?? DEFAULT_PROJECT_ID);
      const address = kit.getAddress();
      if (address) {
        this.walletAddress = address;
        this.setState("confirm_tx");
      } else {
        this.setState("awaiting_wallet");
      }
    } catch (err) {
      console.error("[AdiPay] loadSession error:", err);
      this.setState("failed");
    }
  }

  private async pollStatus() {
    try {
      const res = await fetch(
        `${this.options.apiUrl}/payments/sessions/${this.options.sessionId}`
      );
      if (!res.ok) return;
      const updated: SessionData = await res.json();
      this.session = updated;

      if (updated.status === "confirmed") {
        this.stopPolling();
        this.stopCountdown();
        this.setState("confirmed");
        this.options.onSuccess?.(updated.txHash ?? "");
      } else if (updated.status === "expired" || updated.secondsRemaining <= 0) {
        this.stopPolling();
        this.stopCountdown();
        this.setState("expired");
      }
    } catch (_) {}
  }

  private async connectWallet() {
    const kit = getAppKit(this.options.projectId ?? DEFAULT_PROJECT_ID);
    this.unsubscribeAccount?.();
    this.unsubscribeAccount = kit.subscribeAccount(({ address, isConnected }) => {
      if (isConnected && address && this.state === "awaiting_wallet") {
        this.walletAddress = address;
        this.setState("confirm_tx");
      }
    });
    await kit.open();
  }

  private async disconnectWallet() {
    const kit = getAppKit(this.options.projectId ?? DEFAULT_PROJECT_ID);
    this.unsubscribeAccount?.();
    this.unsubscribeAccount = null;
    await kit.disconnect();
    this.walletAddress = null;
    this.setState("awaiting_wallet");
  }

  private async sendPayment() {
    if (!this.session || !this.walletAddress) return;

    const kit = getAppKit(this.options.projectId ?? DEFAULT_PROJECT_ID);
    const provider = kit.getWalletProvider() as {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    } | undefined;

    if (!provider) {
      this.options.onFailure?.(new Error("No wallet provider available"));
      this.setState("failed");
      return;
    }

    this.setState("pending");
    this.startPolling();

    try {
      const tokenAmountHex = "0x" + BigInt(this.session.tokenAmount).toString(16);
      const data = encodePayNative(this.session.id);

      const txHash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: this.walletAddress,
          to: this.session.contractAddress,
          value: tokenAmountHex,
          data,
        }],
      })) as string;

      console.log("[AdiPay] Transaction sent:", txHash);
    } catch (err) {
      console.error("[AdiPay] sendPayment error:", err);
      this.stopPolling();
      this.setState("failed");
      this.options.onFailure?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private startCountdown() {
    this.countdownInterval = setInterval(() => {
      this.secondsRemaining = Math.max(0, this.secondsRemaining - 1);
      this.updateCountdownDisplay();
      if (this.secondsRemaining === 0) {
        this.stopCountdown();
        this.setState("expired");
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
  }

  private startPolling() {
    this.pollInterval = setInterval(() => this.pollStatus(), 3000);
  }

  private stopPolling() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }

  private updateCountdownDisplay() {
    const el = this.container.querySelector("[data-countdown]");
    if (el) el.textContent = this.formatCountdown(this.secondsRemaining);
  }

  private formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  private render() {
    this.container.innerHTML = this.buildHTML();
    this.attachEventListeners();
  }

  private buildHTML(): string {
    const BLUE = this.BLUE;
    const BLUE_BG = this.BLUE_BG;
    const BLUE_BORDER = this.BLUE_BORDER;
    const FONT = this.FONT;

    const globalCSS = `
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap');
      .adipay-widget * { box-sizing: border-box; font-family: ${FONT}; }
      .adipay-widget {
        background: #fff;
        border-radius: 10px;
        max-width: 408px;
        margin: 0 auto;
        border: 1px solid #eee;
        overflow: hidden;
      }
      .adipay-header {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 30px 34px 20px;
      }
      .adipay-logo-box {
        width: 42px;
        height: 42px;
        background: #eee;
        flex-shrink: 0;
      }
      .adipay-logo-title {
        font-size: 17.46px;
        font-weight: 400;
        color: #000;
        letter-spacing: -0.17px;
        line-height: 1.3;
      }
      .adipay-logo-subtitle {
        font-size: 11.64px;
        color: rgba(0,0,0,0.5);
        letter-spacing: -0.12px;
        line-height: 1.4;
        max-width: 225px;
      }
      .adipay-divider {
        height: 0.5px;
        background: rgba(0,0,0,0.1);
      }
      .adipay-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: 100%;
        height: 50px;
        border: 1px solid ${BLUE};
        border-radius: 4px;
        font-size: 16px;
        font-weight: 400;
        cursor: pointer;
        background: ${BLUE};
        color: #fff;
        letter-spacing: -0.16px;
        font-family: ${FONT};
        box-sizing: border-box;
      }
      .adipay-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .adipay-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: adipay-spin 0.8s linear infinite;
        flex-shrink: 0;
      }
      .adipay-spinner-blue {
        display: inline-block;
        width: 24px;
        height: 24px;
        border: 2px solid rgba(0,60,255,0.2);
        border-top-color: ${BLUE};
        border-radius: 50%;
        animation: adipay-spin 0.8s linear infinite;
      }
      @keyframes adipay-spin { to { transform: rotate(360deg); } }
      .adipay-link-btn {
        background: none;
        border: none;
        color: ${BLUE};
        font-size: 9.3px;
        letter-spacing: -0.09px;
        cursor: pointer;
        text-decoration: underline;
        padding: 0;
        font-family: ${FONT};
      }
    `;

    return `
      <style>${globalCSS}</style>
      <div class="adipay-widget">
        ${this.renderHeader()}
        <div class="adipay-divider"></div>
        ${this.renderState()}
      </div>
    `;
  }

  private renderHeader(): string {
    return `
      <div class="adipay-header">
        <div class="adipay-logo-box"></div>
        <div>
          <div class="adipay-logo-title">Check out with ADI</div>
          <div class="adipay-logo-subtitle">Accept crypto payments, priced in fiat.</div>
        </div>
      </div>
    `;
  }

  private renderState(): string {
    switch (this.state) {
      case "loading":         return this.renderLoading();
      case "awaiting_wallet": return this.renderAwaitingWallet();
      case "confirm_tx":      return this.renderCart(false);
      case "pending":         return this.renderCart(true);
      case "confirmed":       return this.renderConfirmed();
      case "failed":          return this.renderFailed();
      case "expired":         return this.renderExpired();
    }
  }

  // Loading (node 14:30)
  private renderLoading(): string {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 34px;gap:16px;">
        <span class="adipay-spinner-blue"></span>
        <span style="font-size:16px;color:${this.BLUE};letter-spacing:-0.16px;">Processing</span>
      </div>
    `;
  }

  // Awaiting wallet / QR code (node 3:537)
  private renderAwaitingWallet(): string {
    const qrHtml = this.session?.qrCode
      ? `<div style="display:flex;justify-content:center;margin-bottom:20px;padding:0 34px;">
           <img src="${this.session.qrCode}" alt="Payment QR code" style="width:299px;height:299px;display:block;" />
         </div>`
      : "";

    return `
      <div style="padding:16px 0 24px;">
        <div style="display:flex;justify-content:center;margin-bottom:16px;">
          <div style="background:${this.BLUE_BG};border-radius:5px;padding:8px 13px;font-size:9.3px;color:${this.BLUE};opacity:0.8;letter-spacing:-0.09px;">
            Scan the QR code with a compatible wallet
          </div>
        </div>
        ${qrHtml}
        <div style="padding:0 45px;">
          <button class="adipay-btn" data-action="connect" style="gap:15px;">
            ${this.walletIconSVG("white")}
            Connect wallet
          </button>
        </div>
      </div>
    `;
  }

  // Cart view — confirm (node 3:553) and pending/processing (node 12:407)
  private renderCart(isProcessing: boolean): string {
    const tokenNum = this.session
      ? (Number(BigInt(this.session.tokenAmount)) / 1e18).toFixed(2)
      : "0";
    const short = this.walletAddress
      ? `${this.walletAddress.slice(0, 6)}....${this.walletAddress.slice(-4)}`
      : "0x0000....0000";

    const items = this.session?.items ?? [];
    const cartItemsHtml = items.length > 0
      ? items.map((item) => `
          <div style="display:flex;align-items:flex-start;padding:0 34px;margin-bottom:16px;gap:16px;">
            <div style="width:65px;height:65px;background:#eee;border-radius:4px;flex-shrink:0;overflow:hidden;">
              ${item.imageUrl ? `<img src="${item.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;" />` : ""}
            </div>
            <div style="flex:1;">
              <div style="font-size:12px;color:rgba(0,0,0,0.5);letter-spacing:-0.12px;margin-bottom:4px;">${item.description ?? "Item name"}</div>
              <div style="font-size:12px;color:#000;letter-spacing:-0.12px;">${item.name}</div>
            </div>
            <div style="font-size:12px;color:rgba(0,0,0,0.5);letter-spacing:-0.12px;flex-shrink:0;">${item.unitPrice}</div>
          </div>
        `).join("")
      : `
          <div style="display:flex;align-items:flex-start;padding:0 34px;margin-bottom:16px;gap:16px;">
            <div style="width:65px;height:65px;background:#eee;border-radius:4px;flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-size:12px;color:rgba(0,0,0,0.5);letter-spacing:-0.12px;margin-bottom:4px;">Order total</div>
              <div style="font-size:12px;color:#000;letter-spacing:-0.12px;">${this.session?.fiatAmountFormatted ?? ""} ${this.session?.fiatCurrency ?? ""}</div>
            </div>
            <div style="font-size:12px;color:rgba(0,0,0,0.5);letter-spacing:-0.12px;flex-shrink:0;">${this.session?.fiatAmountFormatted ?? ""} ${this.session?.fiatCurrency ?? ""}</div>
          </div>
        `;

    const btnHtml = isProcessing
      ? `<button class="adipay-btn" disabled style="opacity:0.5;cursor:not-allowed;gap:12px;">
           <span class="adipay-spinner"></span>
           <span style="opacity:0.5;">Processing</span>
         </button>`
      : `<button class="adipay-btn" data-action="pay">
           <span style="opacity:0.7;">${tokenNum} ADI –</span>
           <span>Check out</span>
         </button>`;

    return `
      <div style="padding:16px 0 0;">
        ${cartItemsHtml}
        <div style="height:0.5px;background:rgba(0,0,0,0.1);margin:0 34px 16px;"></div>
        <div style="display:flex;justify-content:space-between;padding:0 34px;margin-bottom:16px;font-size:12px;letter-spacing:-0.12px;">
          <span style="color:#000;">Subtotal</span>
          <span style="font-weight:700;color:${this.BLUE};">${this.session?.fiatAmountFormatted ?? ""} ${this.session?.fiatCurrency ?? ""}</span>
        </div>
        <div style="margin:0 8px 0;background:${this.BLUE_BG};border:1px solid ${this.BLUE_BORDER};border-radius:6px;padding:22px 20px 16px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
            <div>
              <div style="font-size:39px;font-weight:400;color:#000;letter-spacing:-0.39px;line-height:1;">${tokenNum}</div>
              <div style="font-size:9.3px;color:rgba(0,0,0,0.5);letter-spacing:-0.09px;margin-top:6px;">${this.session?.fiatAmountFormatted ?? ""}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid ${this.BLUE_BORDER};border-radius:10px;padding:8px 12px;height:41px;">
              ${this.adiLogoSVG()}
              <span style="font-size:14px;color:#000;letter-spacing:-0.14px;">ADI</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
          <div style="margin-bottom:12px;">${btnHtml}</div>
          <div style="display:flex;gap:8px;align-items:center;font-size:9.3px;letter-spacing:-0.09px;">
            <span style="color:rgba(0,0,0,0.5);opacity:0.5;">${short}</span>
            <button class="adipay-link-btn" data-action="disconnect">Change wallet</button>
          </div>
        </div>
      </div>
    `;
  }

  // Confirmed (node 14:220)
  private renderConfirmed(): string {
    const tokenAmt = this.session
      ? `${(Number(BigInt(this.session.tokenAmount)) / 1e18).toFixed(2)} ${this.session.tokenSymbol}`
      : "—";
    const tokenNum = this.session
      ? (Number(BigInt(this.session.tokenAmount)) / 1e18).toFixed(2)
      : "0";
    const txHash = this.session?.txHash ?? "";
    const explorerUrl = `https://explorer.ab.testnet.adifoundation.ai/tx/${txHash}`;
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    return `
      <div style="padding:24px 34px 32px;">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="${this.BLUE}" stroke-width="1.5"/>
            <path d="M8 12l3 3 5-5" stroke="${this.BLUE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span style="font-size:18px;color:${this.BLUE};font-weight:400;letter-spacing:-0.18px;">Success!</span>
        </div>
        <div style="font-size:39px;font-weight:400;color:#000;letter-spacing:-0.39px;margin-bottom:20px;">${tokenAmt}</div>
        <div style="height:0.5px;background:rgba(0,0,0,0.1);margin-bottom:16px;"></div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;font-size:12px;letter-spacing:-0.12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#000;">Subtotal</span>
            <span style="font-weight:700;color:${this.BLUE};">${this.session?.fiatAmountFormatted ?? ""} ${this.session?.fiatCurrency ?? ""}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#000;">Token</span>
            <div style="display:flex;gap:8px;">
              <span style="color:rgba(0,0,0,0.5);">${this.session?.fiatAmountFormatted ?? ""}</span>
              <span style="color:#000;">${tokenNum} ${this.session?.tokenSymbol ?? ""}</span>
            </div>
          </div>
        </div>
        <div style="height:0.5px;background:rgba(0,0,0,0.1);margin-bottom:16px;"></div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;font-size:12px;letter-spacing:-0.12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:rgba(0,0,0,0.5);">Total</span>
            <span style="color:${this.BLUE};">${tokenAmt}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:rgba(0,0,0,0.5);">Date</span>
            <span style="color:rgba(0,0,0,0.5);">${dateStr}</span>
          </div>
        </div>
        <button class="adipay-btn" data-action="view-tx" style="margin-bottom:16px;" ${!txHash ? "disabled" : ""}>
          View transaction
        </button>
        <div style="text-align:center;">
          <button style="background:none;border:none;font-size:16px;color:${this.BLUE};letter-spacing:-0.16px;cursor:pointer;font-family:${this.FONT};" data-action="go-back">
            Go back
          </button>
        </div>
      </div>
    `;
  }

  private renderFailed(): string {
    return `
      <div style="padding:60px 34px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">✗</div>
        <div style="font-size:18px;color:#000;margin-bottom:8px;letter-spacing:-0.18px;">Payment Failed</div>
        <div style="font-size:12px;color:rgba(0,0,0,0.5);margin-bottom:24px;">The transaction was rejected or failed.</div>
        <button class="adipay-btn" data-action="retry">Try Again</button>
      </div>
    `;
  }

  private renderExpired(): string {
    return `
      <div style="padding:60px 34px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⏰</div>
        <div style="font-size:18px;color:#000;margin-bottom:8px;letter-spacing:-0.18px;">Session Expired</div>
        <div style="font-size:12px;color:rgba(0,0,0,0.5);">This payment session has expired. Please request a new payment link.</div>
      </div>
    `;
  }

  // ─── SVG helpers ─────────────────────────────────────────────────────────

  private walletIconSVG(strokeColor: string): string {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
        <path d="M21 7H3C2.44772 7 2 7.44772 2 8V19C2 19.5523 2.44772 20 3 20H21C21.5523 20 22 19.5523 22 19V8C22 7.44772 21.5523 7 21 7Z" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 14C16 14.5523 16.4477 15 17 15C17.5523 15 18 14.5523 18 14C18 13.4477 17.5523 13 17 13C16.4477 13 16 13.4477 16 14Z" fill="${strokeColor}"/>
        <path d="M2 10H22M7 7V5C7 4.44772 7.44772 4 8 4H16C16.5523 4 17 4.44772 17 5V7" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  private adiLogoSVG(): string {
    return `
      <svg width="13" height="18" viewBox="0 0 13 18" fill="none">
        <polygon points="6.5,0 13,9 6.5,18 0,9" fill="#003cff" opacity="0.9"/>
        <polygon points="6.5,4 10,9 6.5,14 3,9" fill="#f97316"/>
      </svg>
    `;
  }

  // ─── Events ──────────────────────────────────────────────────────────────

  private attachEventListeners() {
    this.container.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => this.handleAction(btn.dataset.action!));
    });
  }

  private handleAction(action: string) {
    switch (action) {
      case "connect":    this.connectWallet(); break;
      case "pay":        this.sendPayment(); break;
      case "disconnect": this.disconnectWallet(); break;
      case "retry":      this.state = "loading"; this.init(); break;
      case "view-tx": {
        const txHash = this.session?.txHash;
        if (txHash) window.open(`https://explorer.ab.testnet.adifoundation.ai/tx/${txHash}`, "_blank");
        break;
      }
      case "go-back":    this.setState("awaiting_wallet"); break;
    }
  }

  destroy() {
    this.stopPolling();
    this.stopCountdown();
    this.unsubscribeAccount?.();
    this.unsubscribeAccount = null;
    this.container.innerHTML = "";
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const AdiPay = {
  mount(selector: string | Element, options: WidgetOptions): AdiPayWidget {
    const container = typeof selector === "string"
      ? document.querySelector(selector)
      : selector;
    if (!container) throw new Error(`AdiPay: element not found: ${selector}`);
    return new AdiPayWidget(container, options);
  },
};

export default AdiPay;
export type { WidgetOptions, SessionData, WidgetState };

if (typeof window !== "undefined") {
  (window as unknown as { AdiPay: typeof AdiPay }).AdiPay = AdiPay;
}
