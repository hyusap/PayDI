import { ProductGrid } from "@/components/ProductGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-[#fafafa] px-5 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded bg-[#003cff] text-[10px] font-medium tracking-[0.08em] text-white">
            PAY
          </div>
          <div className="text-[18px] tracking-[-0.18px]">
            PayDI <span className="text-black/55">Test Store</span>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded border border-[#003cff1a] bg-[#003cff0d] text-[#003cff]">
          Powered by PayDI
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-normal tracking-[-0.04em] mb-3 md:text-5xl">
            Test checkout flows with <span className="text-[#003cff]">ultra-low prices</span>
          </h1>
          <p className="text-black/55">Same PayDI integration, tuned for fast local testing and retries.</p>
        </div>

        <ProductGrid />
      </main>

      <footer className="text-center py-8 text-black/45 text-sm border-t border-black/10 bg-[#fafafa]">
        Payments processed by PayDI on ADI Chain
      </footer>
    </div>
  );
}
