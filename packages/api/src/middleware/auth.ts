import type { Context, Next } from "hono";
import { getMerchantByApiKey, getMerchantByWalletAddress, getAuthSession } from "../services/db.ts";

export async function authMiddleware(c: Context, next: Next) {
  const credential =
    c.req.header("x-api-key") ??
    c.req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (!credential) return c.json({ error: "Missing API key" }, 401);

  if (credential.startsWith("ws_")) {
    const session = getAuthSession.get(credential);
    if (!session) return c.json({ error: "Invalid session token" }, 401);

    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at < now) return c.json({ error: "Session expired" }, 401);

    const merchant = getMerchantByWalletAddress.get(session.merchant_address);
    if (!merchant) return c.json({ error: "Merchant not found" }, 401);

    c.set("merchant", merchant);
  } else {
    const merchant = getMerchantByApiKey.get(credential);
    if (!merchant) return c.json({ error: "Invalid API key" }, 401);

    c.set("merchant", merchant);
  }

  await next();
}
