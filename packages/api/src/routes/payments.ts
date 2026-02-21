import { Hono } from "hono";
import { randomBytes } from "crypto";
import {
  insertSession,
  getSessionById,
  getSessionsByMerchant,
  type Merchant,
} from "../services/db.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { fiatToAdi } from "../services/price.ts";
import { createOnChainSession, CONTRACT_ADDRESS, adiTestnet, publicClient, PAYMENT_PROCESSOR_ABI } from "../services/chain.ts";
import { updateSessionStatus } from "../services/db.ts";
import QRCode from "qrcode";

export const paymentsRouter = new Hono<{
  Variables: { merchant: Merchant };
}>();

const SESSION_TTL_SECONDS = 15 * 60;

/// POST /payments/sessions
paymentsRouter.post("/sessions", authMiddleware, async (c) => {
  const merchant = c.get("merchant");

  const body = await c.req.json<{
    orderId?: string;
    fiatAmount: number;
    fiatCurrency?: "AED" | "USD";
  }>();

  if (!body.fiatAmount || body.fiatAmount <= 0) {
    return c.json({ error: "fiatAmount must be a positive integer (e.g. 10000 = 100.00)" }, 400);
  }

  const fiatCurrency = body.fiatCurrency ?? "AED";
  if (!["AED", "USD"].includes(fiatCurrency)) {
    return c.json({ error: "fiatCurrency must be AED or USD" }, 400);
  }

  let tokenAmountWei: bigint;
  try {
    tokenAmountWei = await fiatToAdi(body.fiatAmount, fiatCurrency);
  } catch (err) {
    console.error("[payments] Price conversion error:", err);
    return c.json({ error: "Failed to fetch ADI price for conversion" }, 502);
  }

  const sessionId = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  insertSession.run(
    sessionId,
    merchant.wallet_address,
    body.orderId ?? null,
    body.fiatAmount,
    fiatCurrency,
    "adi",
    tokenAmountWei.toString(),
    expiresAt
  );

  // Settlement goes to the merchant's own wallet address
  let txHash: string | null = null;
  if (CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
    try {
      txHash = await createOnChainSession({
        sessionId,
        merchant: merchant.wallet_address as `0x${string}`,
        fiatAmount: BigInt(body.fiatAmount),
        fiatCurrency,
        tokenAddress: "0x0000000000000000000000000000000000000000",
        tokenAmount: tokenAmountWei,
      });
      console.log("[payments] On-chain session created, tx:", txHash);
    } catch (err) {
      console.warn("[payments] On-chain session creation failed (continuing off-chain):", err);
    }
  }

  const eip681Uri = `ethereum:${CONTRACT_ADDRESS}/payNative?bytes32=${sessionId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(eip681Uri);

  return c.json(
    {
      sessionId,
      orderId: body.orderId ?? null,
      fiatAmount: body.fiatAmount,
      fiatCurrency,
      tokenSymbol: "ADI",
      tokenAmount: tokenAmountWei.toString(),
      tokenAmountFormatted: (Number(tokenAmountWei) / 1e18).toFixed(6),
      merchantAddress: merchant.wallet_address,
      contractAddress: CONTRACT_ADDRESS,
      chainId: adiTestnet.id,
      expiresAt,
      expiresAtIso: new Date(expiresAt * 1000).toISOString(),
      qrCode: qrCodeDataUrl,
      eip681Uri,
      txHash,
    },
    201
  );
});

/// GET /payments/sessions/:id — public, session ID is the access token
paymentsRouter.get("/sessions/:id", async (c) => {
  const id = c.req.param("id");

  const session = getSessionById.get(id);
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }

  const now = Math.floor(Date.now() / 1000);
  if (session.status === "pending" && session.expires_at < now) session.status = "expired";

  // Fallback: if still pending, check on-chain directly in case the event listener missed it
  if (session.status === "pending" && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
    try {
      const onChain = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: PAYMENT_PROCESSOR_ABI,
        functionName: "getSession",
        args: [id as `0x${string}`],
      }) as { fulfilled: boolean };

      if (onChain.fulfilled) {
        // Find the tx hash from on-chain logs
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock: 0n,
          toBlock: "latest",
        });
        const txHash = logs.findLast((l) => l.topics[1] === id)?.transactionHash ?? null;
        updateSessionStatus.run("confirmed", txHash, id);
        session.status = "confirmed";
        session.tx_hash = txHash;
      }
    } catch (_) {}
  }

  return c.json(formatSession(session)!);
});

/// GET /payments/sessions (alias: GET /payments)
paymentsRouter.get("/sessions", authMiddleware, (c) => {
  const merchant = c.get("merchant");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
  const offset = parseInt(c.req.query("offset") ?? "0");

  const sessions = getSessionsByMerchant.all(merchant.wallet_address, limit, offset);

  const now = Math.floor(Date.now() / 1000);
  return c.json({
    sessions: sessions.map((s) => {
      if (s.status === "pending" && s.expires_at < now) s.status = "expired";
      return formatSession(s);
    }),
    limit,
    offset,
  });
});

function formatSession(session: ReturnType<typeof getSessionById.get>) {
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  return {
    id: session.id,
    orderId: session.order_id,
    fiatAmount: session.fiat_amount,
    fiatCurrency: session.fiat_currency,
    fiatAmountFormatted: (session.fiat_amount / 100).toFixed(2),
    tokenSymbol: session.token,
    tokenAmount: session.token_amount,
    tokenAmountFormatted: (Number(BigInt(session.token_amount)) / 1e18).toFixed(6),
    status: session.status,
    txHash: session.tx_hash,
    expiresAt: session.expires_at,
    secondsRemaining: Math.max(0, session.expires_at - now),
    createdAt: session.created_at,
    contractAddress: CONTRACT_ADDRESS,
  };
}
