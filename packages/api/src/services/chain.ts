import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db, updateSessionStatus, getSessionById, getMerchantByWalletAddress } from "./db.ts";

// ─── Chain config ─────────────────────────────────────────────────────────────

const CHAIN_ID = parseInt(process.env.CHAIN_ID ?? "99999");
const RPC_URL = process.env.TESTNET_RPC ?? "https://rpc.ab.testnet.adifoundation.ai/";

export const adiTestnet: Chain = {
  id: CHAIN_ID,
  name: "ADI Chain Testnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "ADI Explorer",
      url: "https://explorer.ab.testnet.adifoundation.ai",
    },
  },
};

export const adiMainnet: Chain = {
  id: 36900,
  name: "ADI Chain Mainnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.adifoundation.ai/"] },
    public: { http: ["https://rpc.adifoundation.ai/"] },
  },
  blockExplorers: {
    default: {
      name: "ADI Explorer",
      url: "https://explorer.adifoundation.ai",
    },
  },
};

// ─── Clients ──────────────────────────────────────────────────────────────────

export const publicClient: PublicClient = createPublicClient({
  chain: CHAIN_ID === 36900 ? adiMainnet : adiTestnet,
  transport: http(RPC_URL),
});

let walletClient: WalletClient | null = null;

export function getWalletClient(): WalletClient {
  if (walletClient) return walletClient;

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY env var not set");

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  walletClient = createWalletClient({
    account,
    chain: CHAIN_ID === 36900 ? adiMainnet : adiTestnet,
    transport: http(RPC_URL),
  });

  return walletClient;
}

// ─── Contract ABI ─────────────────────────────────────────────────────────────

export const PAYMENT_PROCESSOR_ABI = parseAbi([
  "struct PaymentSession { bytes32 sessionId; address merchant; uint256 fiatAmount; bytes3 fiatCurrency; address tokenAddress; uint256 tokenAmount; uint256 expiry; bool fulfilled; }",
  "function createSession((bytes32 sessionId, address merchant, uint256 fiatAmount, bytes3 fiatCurrency, address tokenAddress, uint256 tokenAmount, uint256 expiry, bool fulfilled) params) external returns (bytes32)",
  "function getSession(bytes32 sessionId) external view returns ((bytes32 sessionId, address merchant, uint256 fiatAmount, bytes3 fiatCurrency, address tokenAddress, uint256 tokenAmount, uint256 expiry, bool fulfilled))",
  "function isPayable(bytes32 sessionId) external view returns (bool)",
  "event PaymentReceived(bytes32 indexed sessionId, address indexed merchant, address indexed payer, address token, uint256 tokenAmount, uint256 fiatAmount, bytes3 fiatCurrency)",
]);

export const CONTRACT_ADDRESS = (
  process.env.PAYMENT_PROCESSOR_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

// ─── Create session on-chain ──────────────────────────────────────────────────

export async function createOnChainSession(params: {
  sessionId: `0x${string}`;
  merchant: `0x${string}`;
  fiatAmount: bigint;
  fiatCurrency: string;
  tokenAddress: `0x${string}`;
  tokenAmount: bigint;
}): Promise<`0x${string}`> {
  const wallet = getWalletClient();

  const currencyBytes = new TextEncoder().encode(params.fiatCurrency.padEnd(3, "\0").slice(0, 3));
  const currencyHex = `0x${Buffer.from(currencyBytes).toString("hex")}` as `0x${string}`;

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: PAYMENT_PROCESSOR_ABI,
    functionName: "createSession",
    args: [
      {
        sessionId: params.sessionId,
        merchant: params.merchant,
        fiatAmount: params.fiatAmount,
        fiatCurrency: currencyHex as `0x${string}`,
        tokenAddress: params.tokenAddress,
        tokenAmount: params.tokenAmount,
        expiry: BigInt(0),
        fulfilled: false,
      },
    ],
  });

  return hash;
}

// ─── Event listener ──────────────────────────────────────────────────────────

let unwatch: (() => void) | null = null;

export function startEventListener() {
  if (
    CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    console.log("[chain] No contract address configured, skipping event listener");
    return;
  }

  console.log("[chain] Starting PaymentReceived event listener on", CONTRACT_ADDRESS);

  unwatch = publicClient.watchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: PAYMENT_PROCESSOR_ABI,
    eventName: "PaymentReceived",
    onLogs: async (logs) => {
      for (const log of logs) {
        const { sessionId, payer, token, tokenAmount, fiatAmount, fiatCurrency } = log.args as {
          sessionId: `0x${string}`;
          merchant: `0x${string}`;
          payer: `0x${string}`;
          token: `0x${string}`;
          tokenAmount: bigint;
          fiatAmount: bigint;
          fiatCurrency: `0x${string}`;
        };

        console.log("[chain] PaymentReceived:", sessionId, "tx:", log.transactionHash);

        // sessionId on-chain is bytes32; our DB id is the hex string
        const dbSessionId = sessionId;

        const session = getSessionById.get(dbSessionId);
        if (!session) {
          console.warn("[chain] Session not found in DB:", dbSessionId);
          continue;
        }

        // Mark as confirmed
        updateSessionStatus.run("confirmed", log.transactionHash, dbSessionId);

        // Fire merchant webhook if configured
        const merchant = getMerchantByWalletAddress.get(session.merchant_address);
        if (merchant?.webhook_url) {
          fireWebhook(merchant.webhook_url, {
            event: "payment.confirmed",
            sessionId: dbSessionId,
            txHash: log.transactionHash,
            payer,
            token,
            tokenAmount: tokenAmount.toString(),
            fiatAmount: fiatAmount.toString(),
            fiatCurrency: Buffer.from(fiatCurrency.slice(2), "hex").toString("utf8").replace(/\0/g, ""),
            orderId: session.order_id,
          });
        }
      }
    },
    onError: (error) => {
      console.error("[chain] Event listener error:", error);
    },
  });
}

export function stopEventListener() {
  unwatch?.();
  unwatch = null;
}

async function fireWebhook(url: string, payload: unknown) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[webhook] Failed:", url, res.status);
    }
  } catch (err) {
    console.error("[webhook] Error:", url, err);
  }
}

// ─── Session expiry sweep ─────────────────────────────────────────────────────

export function startExpirySweep(intervalMs = 60_000) {
  return setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    db.prepare("UPDATE payment_sessions SET status = 'expired' WHERE status = 'pending' AND expires_at < ?").run(now);
  }, intervalMs);
}
