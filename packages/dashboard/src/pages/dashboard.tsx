import type { NextPage } from "next";
import Head from "next/head";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowDown, CheckCircle2, Circle, ExternalLink, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import { DashboardShell } from "../components/dashboard-shell";
import { Input } from "../components/ui/input";
import { AUTH_API_KEY_KEY, AUTH_CHANGED_EVENT, AUTH_TOKEN_KEY, AUTH_WALLET_KEY } from "../lib/auth";
import { EXPLORER_BY_CHAIN } from "../wagmi";

interface PaymentSession {
  id: string;
  orderId: string | null;
  tokenAmount: string;
  tokenSymbol: string;
  status: string;
  txHash: string | null;
  createdAt: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const DashboardPage: NextPage = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  const [payments, setPayments] = useState<PaymentSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

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

    setLoading(true);
    fetch(`${API_URL}/payments/sessions?limit=50`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => setPayments(data.sessions ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isConnected, authToken]);

  const filtered = useMemo(() => {
    if (!searchQuery) return payments;
    const query = searchQuery.toLowerCase();
    return payments.filter((payment) => {
      return (
        (payment.orderId ?? "").toLowerCase().includes(query) ||
        payment.tokenSymbol.toLowerCase().includes(query) ||
        payment.status.toLowerCase().includes(query)
      );
    });
  }, [payments, searchQuery]);

  const explorerBase = EXPLORER_BY_CHAIN[chainId] ?? "";

  return (
    <>
      <Head>
        <title>Payments - AdiPay Dashboard</title>
      </Head>
      <DashboardShell
        title="Order history"
        walletAddress={walletAddress}
        apiKey={apiKey}
        activePage="payments"
        topRight={
          <div className="flex items-center gap-3">
            {!isConnected && (
              <div className="[&>div>button]:h-10 [&>div>button]:rounded [&>div>button]:border [&>div>button]:border-[#003cff1a] [&>div>button]:bg-[#003cff] [&>div>button]:px-4 [&>div>button]:text-sm [&>div>button]:font-normal [&>div>button]:text-white">
                <ConnectButton showBalance={false} chainStatus="none" />
              </div>
            )}
            <button className="text-2xl leading-none text-black" aria-label="menu">
              ...
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[17px] -translate-y-1/2 text-black/50" strokeWidth={1.5} />
            <Input
              className="h-[50px] rounded border-[#eeeeee] bg-white pl-11 text-[12px] tracking-[-0.12px] placeholder:text-black/50"
              placeholder="Search token name or symbol"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          {!isConnected && (
            <div className="flex items-center justify-between rounded border border-[#003cff1a] bg-[#003cff0d] px-5 py-3">
              <p className="text-[13px] text-black/60">Connect your wallet to view payment history.</p>
              <div className="[&>div>button]:h-9 [&>div>button]:rounded [&>div>button]:bg-[#003cff] [&>div>button]:px-4 [&>div>button]:text-xs [&>div>button]:font-normal [&>div>button]:text-white">
                <ConnectButton showBalance={false} chainStatus="none" />
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full">
              <thead>
                <tr className="h-[54px] border-b border-black/10 text-left text-[15px] font-medium text-black">
                  <th className="px-6">Order</th>
                  <th className="px-6">
                    <span className="inline-flex items-center gap-2">
                      Date
                      <ArrowDown className="size-[12px]" strokeWidth={1.5} />
                    </span>
                  </th>
                  <th className="px-6">Total</th>
                  <th className="px-6">Platform</th>
                  <th className="px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {isConnected && loading && (
                  <tr>
                    <td className="px-6 py-8 text-[14px] text-black/50" colSpan={5}>
                      Loading payments...
                    </td>
                  </tr>
                )}

                {isConnected && !loading && filtered.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-[14px] text-black/50" colSpan={5}>
                      No payments yet.
                    </td>
                  </tr>
                )}

                {isConnected &&
                  filtered.map((payment) => {
                    const amount = payment.tokenAmount
                      ? `${(Number(BigInt(payment.tokenAmount)) / 1e18).toFixed(0)} ${payment.tokenSymbol}`
                      : "-";
                    const date = new Date(payment.createdAt * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr key={payment.id} className="h-[78px] text-[15px] text-[#3b3b3b]">
                        <td className="px-6">
                          <div className="flex items-center gap-[18px]">
                            <div className="flex size-[36px] items-center justify-center rounded-full border border-[#003cff1a] bg-[#003cff0d] text-[11px] font-medium uppercase text-[#003cff]">
                              {(payment.orderId ?? "P").slice(0, 1)}
                            </div>
                            <span className="font-medium">{payment.orderId ?? "Payment"}</span>
                          </div>
                        </td>
                        <td className="px-6">{date}</td>
                        <td className="px-6">{amount}</td>
                        <td className="px-6">
                          {payment.orderId ?? "-"}
                          {payment.txHash && explorerBase ? (
                            <a
                              href={`${explorerBase}/tx/${payment.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 inline-flex align-middle text-black/50 hover:text-black"
                            >
                              <ExternalLink className="size-3.5" strokeWidth={1.5} />
                            </a>
                          ) : null}
                        </td>
                        <td className="px-6">
                          <PaymentStatusIcon status={payment.status} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardShell>
    </>
  );
};

function PaymentStatusIcon({ status }: { status: string }) {
  if (status === "confirmed") return <CheckCircle2 className="size-[18px] text-[#22c55e]" strokeWidth={1.5} />;
  if (status === "expired" || status === "failed") return <XCircle className="size-[18px] text-[#ef4444]" strokeWidth={1.5} />;
  return <Circle className="size-[18px] text-[#f59e0b]" strokeWidth={1.5} />;
}

export default DashboardPage;
