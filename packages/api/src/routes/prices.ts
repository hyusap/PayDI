import { Hono } from "hono";
import { getAdiPrices, getPriceCache } from "../services/price.ts";

export const pricesRouter = new Hono();

/// GET /prices/ADI  →  { symbol, usd, aed }
pricesRouter.get("/:symbol", async (c) => {
  const symbol = c.req.param("symbol").toUpperCase();

  if (symbol !== "ADI") {
    return c.json({ error: "Only ADI price supported" }, 400);
  }

  try {
    const prices = await getAdiPrices();
    return c.json({
      symbol: "ADI",
      usd: prices.usd,
      aed: prices.aed,
      cachedAt: Date.now(),
    });
  } catch (err) {
    console.error("[prices] Fetch error:", err);
    return c.json({ error: "Failed to fetch price" }, 502);
  }
});

/// GET /prices/_cache  — debug endpoint
pricesRouter.get("/_cache", (c) => {
  return c.json(getPriceCache());
});
