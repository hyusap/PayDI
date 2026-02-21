import { Hono } from "hono";
import {
  getMerchantByWalletAddress,
  updateMerchantConfig,
  type Merchant,
} from "../services/db.ts";
import { authMiddleware } from "../middleware/auth.ts";

export const merchantsRouter = new Hono<{
  Variables: { merchant: Merchant };
}>();

/// GET /merchants/me
merchantsRouter.get("/me", authMiddleware, (c) => {
  const merchant = c.get("merchant");
  return c.json({
    walletAddress: merchant.wallet_address,
    settlementToken: merchant.settlement_token,
    webhookUrl: merchant.webhook_url,
    createdAt: merchant.created_at,
  });
});

/// PUT /merchants/config
merchantsRouter.put("/config", authMiddleware, async (c) => {
  const merchant = c.get("merchant");
  const body = await c.req.json<{
    settlementToken?: string;
    webhookUrl?: string;
  }>();

  const settlementToken = body.settlementToken ?? merchant.settlement_token;
  const webhookUrl = body.webhookUrl ?? merchant.webhook_url ?? null;

  updateMerchantConfig.run(settlementToken, webhookUrl, merchant.wallet_address);

  const updated = getMerchantByWalletAddress.get(merchant.wallet_address);
  return c.json({
    walletAddress: updated!.wallet_address,
    settlementToken: updated!.settlement_token,
    webhookUrl: updated!.webhook_url,
  });
});
