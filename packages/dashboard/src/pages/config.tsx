import type { NextPage } from "next";
import Head from "next/head";
import { Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { DashboardShell } from "../components/dashboard-shell";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { AUTH_API_KEY_KEY, AUTH_CHANGED_EVENT, AUTH_TOKEN_KEY, AUTH_WALLET_KEY } from "../lib/auth";

interface MerchantConfig {
  walletAddress: string;
  settlementToken: string;
  webhookUrl: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const ConfigPage: NextPage = () => {
  const { isConnected } = useAccount();

  const [config, setConfig] = useState<MerchantConfig | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settlementToken, setSettlementToken] = useState("adi");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshAuth = () => {
      setWalletAddress(localStorage.getItem(AUTH_WALLET_KEY));
      setApiKey(localStorage.getItem(AUTH_API_KEY_KEY));
      setAuthToken(localStorage.getItem(AUTH_TOKEN_KEY));
    };

    refreshAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !authToken) return;

    fetch(`${API_URL}/merchants/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((response) => response.json())
      .then((data: MerchantConfig) => {
        setConfig(data);
        setSettlementToken(data.settlementToken ?? "adi");
        setWebhookUrl(data.webhookUrl ?? "");
      })
      .catch(console.error);
  }, [isConnected, authToken]);

  const handleSave = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`${API_URL}/merchants/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settlementToken,
          webhookUrl: webhookUrl || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Save failed");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Config - AdiPay Dashboard</title>
      </Head>

      <DashboardShell
        title="Settings"
        subtitle="Configure settlement and webhook preferences for this wallet."
        walletAddress={walletAddress}
        apiKey={apiKey}
        activePage="config"
        topRight={<Ellipsis className="size-6 text-black" strokeWidth={1} />}
      >
        {!isConnected ? (
          <Card className="max-w-[1123px] rounded border-[#eeeeee] shadow-none">
            <CardContent className="p-6 text-[14px] text-black/50">
              Connect your wallet from the sidebar to manage your merchant configuration.
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-[1123px] rounded border-[#eeeeee] shadow-none">
            <CardHeader className="border-b border-[#eeeeee] pb-6">
              <CardTitle className="text-[20px] font-normal tracking-[-0.2px]">Merchant settings</CardTitle>
              <CardDescription className="text-[13px] text-black/50">
                Your merchant identity is wallet-based. Use the API key only on trusted backend services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div className="space-y-2">
                <p className="text-[12px] tracking-[-0.12px] text-black/60">Settlement address</p>
                <p className="rounded border border-[#eeeeee] bg-[#fafafa] px-3 py-3 font-mono text-[12px] tracking-[-0.12px] break-all text-black/60">
                  {config?.walletAddress ?? walletAddress ?? "Not available"}
                </p>
              </div>

              {apiKey && (
                <div className="space-y-2">
                  <p className="text-[12px] tracking-[-0.12px] text-black/60">API key</p>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      readOnly
                      value={showApiKey ? apiKey : `sk_${"*".repeat(40)}`}
                      className="h-[44px] rounded border-[#eeeeee] bg-[#fafafa] font-mono text-[12px] text-black/70"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-[44px] rounded border-[#eeeeee] bg-white text-[12px] font-normal text-black/70"
                        onClick={() => setShowApiKey((value) => !value)}
                      >
                        {showApiKey ? "Hide" : "Show"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-[44px] rounded border-[#eeeeee] bg-white text-[12px] font-normal text-black/70"
                        onClick={() => navigator.clipboard.writeText(apiKey)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[12px] tracking-[-0.12px] text-black/60" htmlFor="settlement-token">
                  Settlement token
                </label>
                <select
                  id="settlement-token"
                  className="h-[44px] w-full rounded border border-[#eeeeee] bg-white px-3 text-[12px] tracking-[-0.12px] text-black/70 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring/30"
                  value={settlementToken}
                  onChange={(event) => setSettlementToken(event.target.value)}
                >
                  <option value="adi">ADI (native)</option>
                  <option value="usdc">USDC</option>
                  <option value="usdt">USDT</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] tracking-[-0.12px] text-black/60" htmlFor="webhook-url">
                  Webhook URL
                </label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://yourdomain.com/webhooks/adipay"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  className="h-[44px] rounded border-[#eeeeee] bg-white text-[12px] tracking-[-0.12px]"
                />
                <p className="text-[12px] text-black/50">Receives payment.confirmed events.</p>
              </div>

              {error && <p className="text-[13px] text-destructive">{error}</p>}
              {saved && <p className="text-[13px] text-emerald-600">Saved.</p>}

              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-14 rounded bg-[#003cff] px-6 text-[18px] font-normal tracking-[-0.18px] text-white hover:bg-[#0037eb]"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </CardContent>
          </Card>
        )}
      </DashboardShell>
    </>
  );
};

export default ConfigPage;
