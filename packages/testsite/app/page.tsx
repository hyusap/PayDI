import { ProductGrid } from "@/components/ProductGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-8 h-16 flex items-center justify-between">
        <div className="text-xl font-black text-violet-400 tracking-tight">
          ADI<span className="text-white font-normal">Store</span>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-violet-900/40 text-violet-300 border border-violet-700/40">
          Powered by AdiPay
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3">
            Pay anything with <span className="text-violet-400">ADI Chain</span>
          </h1>
          <p className="text-slate-400">A demo store showing AdiPay widget integration</p>
        </div>

        <ProductGrid />
      </main>

      <footer className="text-center py-8 text-slate-500 text-sm border-t border-slate-800">
        Payments processed by AdiPay on ADI Chain
      </footer>
    </div>
  );
}
