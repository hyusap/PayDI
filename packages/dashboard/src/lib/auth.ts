import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import { createSiweMessage } from "viem/siwe";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const AUTH_TOKEN_KEY = "adipay_token";
export const AUTH_WALLET_KEY = "adipay_wallet";
export const AUTH_API_KEY_KEY = "adipay_api_key";
export const AUTH_CHANGED_EVENT = "adipay-auth-changed";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    const res = await fetch(`${API_URL}/auth/nonce`);
    if (!res.ok) throw new Error("Failed to fetch nonce");
    return res.text();
  },

  createMessage: ({ nonce, address, chainId }) => {
    return createSiweMessage({
      domain: window.location.host,
      address: address as `0x${string}`,
      statement: "Sign in to AdiPay Dashboard",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    });
  },

  verify: async ({ message, signature }) => {
    const res = await fetch(`${API_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_WALLET_KEY, data.walletAddress);
    localStorage.setItem(AUTH_API_KEY_KEY, data.apiKey);
    emitAuthChanged();

    return true;
  },

  signOut: async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_WALLET_KEY);
    localStorage.removeItem(AUTH_API_KEY_KEY);
    emitAuthChanged();
  },
});
