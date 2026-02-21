import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH ?? "./adipay.db";

export const db = new Database(DB_PATH, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS merchants (
    wallet_address   TEXT PRIMARY KEY,
    api_key          TEXT NOT NULL UNIQUE,
    settlement_token TEXT DEFAULT 'adi',
    webhook_url      TEXT,
    created_at       INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS payment_sessions (
    id               TEXT PRIMARY KEY,
    merchant_address TEXT NOT NULL REFERENCES merchants(wallet_address),
    order_id         TEXT,
    fiat_amount      INTEGER NOT NULL,
    fiat_currency    TEXT NOT NULL DEFAULT 'AED',
    token            TEXT NOT NULL DEFAULT 'adi',
    token_amount     TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    tx_hash          TEXT,
    expires_at       INTEGER NOT NULL,
    created_at       INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_payment_sessions_merchant
    ON payment_sessions(merchant_address);

  CREATE INDEX IF NOT EXISTS idx_payment_sessions_status
    ON payment_sessions(status);

  CREATE TABLE IF NOT EXISTS auth_nonces (
    nonce      TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token            TEXT PRIMARY KEY,
    merchant_address TEXT NOT NULL REFERENCES merchants(wallet_address),
    expires_at       INTEGER NOT NULL,
    created_at       INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// ─── Merchant ─────────────────────────────────────────────────────────────────

export interface Merchant {
  wallet_address: string;
  api_key: string;
  settlement_token: string;
  webhook_url: string | null;
  created_at: number;
}

export const getMerchantByWalletAddress = db.prepare<Merchant, [string]>(
  "SELECT * FROM merchants WHERE wallet_address = ?"
);

export const getMerchantByApiKey = db.prepare<Merchant, [string]>(
  "SELECT * FROM merchants WHERE api_key = ?"
);

export const insertMerchant = db.prepare(
  "INSERT INTO merchants (wallet_address, api_key) VALUES (?, ?)"
);

export const updateMerchantConfig = db.prepare(
  "UPDATE merchants SET settlement_token = ?, webhook_url = ? WHERE wallet_address = ?"
);

// ─── Auth nonces ──────────────────────────────────────────────────────────────

export const insertNonce = db.prepare(
  "INSERT INTO auth_nonces (nonce) VALUES (?)"
);

export const getNonce = db.prepare<{ nonce: string; created_at: number }, [string]>(
  "SELECT * FROM auth_nonces WHERE nonce = ?"
);

export const deleteNonce = db.prepare(
  "DELETE FROM auth_nonces WHERE nonce = ?"
);

// ─── Auth sessions ────────────────────────────────────────────────────────────

export interface AuthSession {
  token: string;
  merchant_address: string;
  expires_at: number;
  created_at: number;
}

export const insertAuthSession = db.prepare(
  "INSERT INTO auth_sessions (token, merchant_address, expires_at) VALUES (?, ?, ?)"
);

export const getAuthSession = db.prepare<AuthSession, [string]>(
  "SELECT * FROM auth_sessions WHERE token = ?"
);

export const deleteAuthSession = db.prepare(
  "DELETE FROM auth_sessions WHERE token = ?"
);

// ─── Payment sessions ─────────────────────────────────────────────────────────

export interface PaymentSession {
  id: string;
  merchant_address: string;
  order_id: string | null;
  fiat_amount: number;
  fiat_currency: string;
  token: string;
  token_amount: string;
  status: "pending" | "confirmed" | "expired" | "failed";
  tx_hash: string | null;
  expires_at: number;
  created_at: number;
}

export const insertSession = db.prepare(
  `INSERT INTO payment_sessions
     (id, merchant_address, order_id, fiat_amount, fiat_currency, token, token_amount, expires_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

export const getSessionById = db.prepare<PaymentSession, [string]>(
  "SELECT * FROM payment_sessions WHERE id = ?"
);

export const getSessionsByMerchant = db.prepare<PaymentSession, [string, number, number]>(
  "SELECT * FROM payment_sessions WHERE merchant_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
);

export const updateSessionStatus = db.prepare(
  "UPDATE payment_sessions SET status = ?, tx_hash = ? WHERE id = ?"
);
