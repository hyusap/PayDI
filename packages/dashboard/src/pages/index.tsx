import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const HomePage: NextPage = () => {
  const [copied, setCopied] = useState(false);

  const copyAgentInstructions = async () => {
    try {
      const response = await fetch("/llms.txt");
      const instructions = await response.text();
      await navigator.clipboard.writeText(instructions);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Head>
        <title>PayDI - Crypto Checkout Infrastructure</title>
      </Head>

      <div className="min-h-screen bg-white text-black">
        <header className="border-b border-black/10 bg-[#fafafa]">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded bg-[#003cff] text-[11px] font-medium tracking-[0.08em] text-white">
                ADI
              </div>
              <div>
                <p className="text-[17px] tracking-[-0.17px]">PayDI</p>
                <p className="text-[11px] tracking-[-0.11px] text-black/50">Checkout with ADI</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-[13px] text-black/70 hover:text-black">
                Dashboard
              </Link>
              <span className="text-black/20">|</span>
              <Link href="/config" className="text-[13px] text-black/70 hover:text-black">
                Config
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1200px] px-5 pb-14 pt-12 md:px-8 md:pt-16">
          <section className="mx-auto max-w-[760px] text-center">
            <p className="mb-3 inline-flex rounded border border-[#003cff1a] bg-[#003cff0d] px-3 py-1 text-[11px] tracking-[-0.11px] text-[#003cff]">
              Open crypto checkout stack
            </p>
            <h1 className="text-4xl font-normal tracking-[-0.04em] md:text-5xl">PayDI</h1>
            <p className="mt-4 text-[15px] leading-7 text-black/70">
              PayDI lets merchants price products in fiat, settle in ADI, and track payment sessions in real time. It includes a
              wallet-powered checkout widget, session APIs, and an operator dashboard.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded border border-[#003cff1a] bg-[#003cff0d] px-5 text-[15px] text-[#003cff]"
              >
                View dashboard
              </Link>
              <Button
                onClick={copyAgentInstructions}
                className="h-12 rounded bg-[#003cff] px-5 text-[15px] font-normal tracking-[-0.15px] text-white hover:bg-[#0037eb]"
              >
                <Copy className="size-4" />
                Copy instructions for your Agent
              </Button>
              {copied && <span className="text-[13px] text-emerald-600">Copied.</span>}
            </div>
          </section>

          <section className="mt-12">
            <div className="mb-5">
              <h2 className="text-[24px] font-normal tracking-[-0.24px]">System + Integration</h2>
              <p className="mt-1 text-[13px] text-black/50">How PayDI works and how to drop it into your app quickly.</p>
            </div>

            <Card className="rounded border-[#eeeeee] shadow-none">
              <CardHeader>
                <CardTitle className="text-[20px] font-normal tracking-[-0.2px]">How the system works</CardTitle>
                <CardDescription className="text-[13px] text-black/50">Merchant backend + widget + chain settlement</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-[14px] leading-6 text-black/70 md:grid-cols-2">
                <p><span className="text-black">1.</span> Your backend creates a payment session for an order.</p>
                <p><span className="text-black">2.</span> Frontend renders the PayDI widget with that session id.</p>
                <p><span className="text-black">3.</span> Shopper connects wallet and signs transaction.</p>
                <p><span className="text-black">4.</span> PayDI API tracks status and marks session confirmed.</p>
                <p className="md:col-span-2"><span className="text-black">5.</span> Dashboard and webhook flow update your system instantly.</p>
              </CardContent>
            </Card>
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <Card className="rounded border-[#eeeeee] shadow-none">
              <CardHeader>
                <CardTitle className="text-[20px] font-normal tracking-[-0.2px]">Integrate the widget</CardTitle>
                <CardDescription className="text-[13px] text-black/50">React / Next.js quickstart</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[12px] tracking-[-0.12px] text-black/60">Install</p>
                  <pre className="overflow-x-auto rounded border border-[#eeeeee] bg-[#fafafa] p-3 text-[12px] text-black/80">
                    bun add paydi-widget
                  </pre>
                </div>

                <div className="space-y-2">
                  <p className="text-[12px] tracking-[-0.12px] text-black/60">Render the widget</p>
                  <pre className="overflow-x-auto rounded border border-[#eeeeee] bg-[#fafafa] p-3 text-[12px] text-black/80">
{`import { PayDIWidget } from "paydi-widget"

<PayDIWidget
  sessionId="<SESSION_ID>"
  apiUrl="https://your-api.example.com"
  onSuccess={(txHash) => console.log(txHash)}
/>`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded border-[#eeeeee] shadow-none">
              <CardHeader>
                <CardTitle className="text-[20px] font-normal tracking-[-0.2px]">Integration checklist</CardTitle>
                <CardDescription className="text-[13px] text-black/50">Production-ready setup notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-[14px] text-black/70">
                <p>- Create sessions server-side and pass only session ids client-side.</p>
                <p>- Set webhook URL to sync confirmed payments into your order system.</p>
                <p>- Use `onSuccess` to mark checkout complete in your frontend.</p>
                <p>- Keep `apiUrl` environment-specific for dev/stage/prod.</p>
                <p>- Keep one canonical instruction source for AI agents.</p>
              </CardContent>
            </Card>
          </section>

          <section className="mt-10 rounded border border-[#eeeeee] bg-[#fafafa] p-5">
            <p className="mb-3 text-[13px] tracking-[-0.13px] text-black/60">Agent-ready instruction source</p>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Link
                href="/llms.txt"
                className="inline-flex h-11 items-center gap-2 rounded border border-[#eeeeee] bg-white px-4 text-[13px] text-black/80"
              >
                /llms.txt
                <ExternalLink className="size-4" />
              </Link>
              <Button
                onClick={copyAgentInstructions}
                className="h-11 rounded bg-[#003cff] px-5 text-[14px] font-normal tracking-[-0.14px] text-white hover:bg-[#0037eb]"
              >
                <Copy className="size-4" />
                Copy instructions for your Agent
              </Button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default HomePage;
