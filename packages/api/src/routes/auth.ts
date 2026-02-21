import { Hono } from "hono";
import { randomBytes } from "crypto";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { createPublicClient, http } from "viem";
import {
  insertNonce, getNonce, deleteNonce,
  insertMerchant, getMerchantByWalletAddress,
  insertAuthSession, deleteAuthSession,
} from "../services/db.ts";
import { adiTestnet } from "../services/chain.ts";

export const authRouter = new Hono();

const NONCE_TTL_SECONDS = 5 * 60;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const publicClient = createPublicClient({ chain: adiTestnet, transport: http() });

authRouter.get("/nonce", (c) => {
  const nonce = randomBytes(16).toString("hex");
  insertNonce.run(nonce);
  return c.text(nonce);
});

authRouter.post("/verify", async (c) => {
  let body: { message: string; signature: string };
  try { body = await c.req.json(); }
  catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { message, signature } = body;
  if (!message || !signature) return c.json({ error: "message and signature required" }, 400);

  let parsed: ReturnType<typeof parseSiweMessage>;
  try { parsed = parseSiweMessage(message); }
  catch { return c.json({ error: "Invalid SIWE message" }, 400); }

  const { nonce, address } = parsed;
  if (!nonce || !address) return c.json({ error: "SIWE message missing nonce or address" }, 400);

  const nonceRow = getNonce.get(nonce);
  if (!nonceRow) return c.json({ error: "Unknown or expired nonce" }, 401);

  const now = Math.floor(Date.now() / 1000);
  if (now - nonceRow.created_at > NONCE_TTL_SECONDS) {
    deleteNonce.run(nonce);
    return c.json({ error: "Nonce expired" }, 401);
  }
  deleteNonce.run(nonce);

  let valid = false;
  try { valid = await verifySiweMessage(publicClient, { message, signature: signature as `0x${string}` }); }
  catch { return c.json({ error: "Signature verification failed" }, 401); }
  if (!valid) return c.json({ error: "Invalid signature" }, 401);

  const walletAddress = address.toLowerCase();
  let merchant = getMerchantByWalletAddress.get(walletAddress);

  if (!merchant) {
    const apiKey = `sk_${randomBytes(24).toString("hex")}`;
    insertMerchant.run(walletAddress, apiKey);
    merchant = getMerchantByWalletAddress.get(walletAddress)!;
  }

  const token = `ws_${randomBytes(32).toString("hex")}`;
  insertAuthSession.run(token, merchant.wallet_address, now + SESSION_TTL_SECONDS);

  // Always return the api key — merchant can always see it when logged in
  return c.json({ token, walletAddress, apiKey: merchant.api_key });
});

authRouter.post("/logout", async (c) => {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (token?.startsWith("ws_")) deleteAuthSession.run(token);
  return c.json({ ok: true });
});
