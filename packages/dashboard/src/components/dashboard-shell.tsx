import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Copy, Ellipsis, House, Settings, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./ui/button";

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  walletAddress: string | null;
  apiKey: string | null;
  activePage: "payments" | "config";
  topRight?: ReactNode;
  children: ReactNode;
}

function compactAddress(address: string | null) {
  if (!address) return "No wallet connected";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function DashboardShell({
  title,
  subtitle,
  walletAddress,
  apiKey,
  activePage,
  topRight,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1720px] md:grid-cols-[388px_1fr]">
        <aside className="relative border-b border-slate-200 bg-[#fafafa] px-5 py-8 md:sticky md:top-0 md:h-screen md:self-start md:border-b-0 md:border-r md:px-8 md:py-14">
          <div className="mb-8 flex items-center gap-4 md:mb-9">
            <div className="flex size-[42px] items-center justify-center rounded bg-[#003cff] text-[11px] font-medium tracking-[0.08em] text-white">
              ADI
            </div>
            <div>
              <p className="text-[17px] font-normal tracking-[-0.17px]">Check out with ADI</p>
              <p className="max-w-[225px] text-[11px] font-normal tracking-[-0.12px] text-black/50">
                Accept crypto payments, priced in fiat.
              </p>
            </div>
          </div>

          <nav className="space-y-3">
            <Link
              href="/dashboard"
              className={`flex h-[49px] items-center gap-3 rounded px-5 text-[12px] tracking-[-0.12px] transition ${
                activePage === "payments"
                  ? "border border-[#003cff1a] bg-[#003cff0d] text-[#003cff]"
                  : "text-black/50 hover:bg-slate-100"
              }`}
            >
              <House className="size-[17px]" strokeWidth={1.5} />
              Home
            </Link>
            <Link
              href="/config"
              className={`flex h-[49px] items-center gap-3 rounded px-5 text-[12px] tracking-[-0.12px] transition ${
                activePage === "config"
                  ? "border border-[#003cff1a] bg-[#003cff0d] text-[#003cff]"
                  : "text-black/50 hover:bg-slate-100"
              }`}
            >
              <Settings className="size-[17px]" strokeWidth={1.5} />
              Settings
            </Link>
          </nav>

          <div className="mt-10 border border-[#003cff1a] bg-[#003cff0d] p-5 md:absolute md:bottom-6 md:left-2 md:right-2">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex size-[42px] items-center justify-center bg-white">
                <UserRound className="size-[17px] text-black/50" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[17px] tracking-[-0.17px]">Merchant Wallet</p>
                <p className="mt-1 font-mono text-[11px] tracking-[-0.11px] text-black/50">{compactAddress(walletAddress)}</p>
              </div>
            </div>
            <Button
              className="h-14 w-full rounded bg-[#003cff] text-[18px] font-normal tracking-[-0.18px] hover:bg-[#0037eb]"
              disabled={!apiKey}
              onClick={() => apiKey && navigator.clipboard.writeText(apiKey)}
            >
              <Copy className="size-[20px]" strokeWidth={1.5} />
              Copy API key
            </Button>
            <div className="mt-3 [&>div]:w-full [&>div>button]:h-11 [&>div>button]:w-full [&>div>button]:rounded [&>div>button]:border [&>div>button]:border-[#003cff1a] [&>div>button]:bg-white/90 [&>div>button]:text-sm [&>div>button]:font-normal [&>div>button]:text-black/80">
              <ConnectButton showBalance={false} chainStatus="none" />
            </div>
          </div>
        </aside>

        <main className="px-5 py-8 md:px-24 md:py-44">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[32px] font-normal tracking-[-0.32px]">{title}</h1>
              {subtitle ? <p className="mt-1 text-[13px] text-black/40">{subtitle}</p> : null}
            </div>
            {topRight ?? <Ellipsis className="size-6 text-black" strokeWidth={1} />}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
