import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { authRouter } from "./routes/auth.ts";
import { merchantsRouter } from "./routes/merchants.ts";
import { paymentsRouter } from "./routes/payments.ts";
import { pricesRouter } from "./routes/prices.ts";
import { startEventListener, startExpirySweep } from "./services/chain.ts";
import { db } from "./services/db.ts";

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (process.env.CORS_ORIGINS ?? "*").split(","),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ status: "ok", version: "0.1.0", timestamp: new Date().toISOString() })
);

app.route("/auth", authRouter);
app.route("/merchants", merchantsRouter);
app.route("/payments", paymentsRouter);
app.route("/prices", pricesRouter);

// ─── 404 / error ──────────────────────────────────────────────────────────────

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error("[error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

// ─── Background processes ─────────────────────────────────────────────────────

startEventListener();
startExpirySweep();

// Cleanup expired nonces and web sessions every 10 minutes
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  db.prepare("DELETE FROM auth_nonces WHERE created_at < ?").run(now - 5 * 60);
  db.prepare("DELETE FROM auth_sessions WHERE expires_at < ?").run(now);
}, 10 * 60 * 1000);

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3000");
console.log(`AdiPay API listening on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
