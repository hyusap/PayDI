"use client";

import { useState } from "react";
import { PRODUCTS } from "@/lib/products";
import { CheckoutModal } from "./CheckoutModal";

interface CheckoutData {
  sessionId: string;
  apiUrl: string;
  product: { name: string; emoji: string; price: number; quantity: number; totalFormatted: string };
  tokenAmountFormatted: string;
  tokenSymbol: string;
}

export function ProductGrid() {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, 1]))
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);

  const changeQty = (id: string, delta: number) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(1, (q[id] ?? 1) + delta) }));

  const buy = async (productId: string) => {
    setLoadingId(productId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: quantities[productId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Server error");
      setCheckout(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Object.entries(PRODUCTS).map(([id, product]) => (
          <div
            key={id}
            className="rounded-2xl border border-[#eeeeee] bg-white p-6 flex flex-col gap-3 transition-colors hover:border-[#003cff33]"
          >
            <div className="text-5xl">{product.emoji}</div>
            <div className="text-[18px] tracking-[-0.18px]">{product.name}</div>
            <div className="text-sm text-black/50 flex-1">{product.description}</div>
            <div className="text-2xl font-medium text-[#003cff]">${product.price.toFixed(2)}</div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeQty(id, -1)}
                className="w-8 h-8 rounded border border-[#eeeeee] text-black hover:border-[#003cff55] transition-colors flex items-center justify-center"
              >
                −
              </button>
              <span className="min-w-[20px] text-center font-semibold text-black">
                {quantities[id]}
              </span>
              <button
                onClick={() => changeQty(id, 1)}
                className="w-8 h-8 rounded border border-[#eeeeee] text-black hover:border-[#003cff55] transition-colors flex items-center justify-center"
              >
                +
              </button>
            </div>

            <button
              onClick={() => buy(id)}
              disabled={loadingId === id}
              className="w-full py-3 bg-[#003cff] hover:bg-[#0037eb] disabled:opacity-50 text-white font-normal rounded transition-colors"
            >
              {loadingId === id ? "Creating session…" : "Buy with ADI"}
            </button>
          </div>
        ))}
      </div>

      {checkout && <CheckoutModal data={checkout} onClose={() => setCheckout(null)} />}
    </>
  );
}
