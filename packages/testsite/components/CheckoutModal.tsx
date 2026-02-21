"use client";

import dynamic from "next/dynamic";

type PayDIWidgetProps = {
  sessionId: string;
  apiUrl: string;
  theme?: "light" | "dark";
  onSuccess?: () => void;
  onFailure?: (err: Error) => void;
};

const PayDIWidget = dynamic(
  () => import("paydi-widget").then((m) => m.PayDIWidget as React.ComponentType<PayDIWidgetProps>),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8 text-slate-400">Loading payment…</div> }
);

interface CheckoutData {
  sessionId: string;
  apiUrl: string;
  product: {
    name: string;
    emoji: string;
    price: number;
    quantity: number;
    totalFormatted: string;
  };
  tokenAmountFormatted: string;
  tokenSymbol: string;
}

interface Props {
  data: CheckoutData | null;
  onClose: () => void;
}

export function CheckoutModal({ data, onClose }: Props) {
  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Checkout</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:border-red-400 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Order summary */}
        <div className="mx-5 mt-4 bg-slate-900 rounded-xl p-4 text-sm">
          <div className="flex justify-between text-slate-400 mb-2">
            <span>{data.product.emoji} {data.product.name}</span>
            <span>×{data.product.quantity}</span>
          </div>
          <div className="flex justify-between font-bold text-white text-base border-t border-slate-700 pt-3 mt-2">
            <span>Total</span>
            <span>{data.product.totalFormatted} ≈ {data.tokenAmountFormatted} {data.tokenSymbol}</span>
          </div>
        </div>

        {/* Widget */}
        <div className="p-5">
          <PayDIWidget
            sessionId={data.sessionId}
            apiUrl={data.apiUrl}
            theme="dark"
            onSuccess={() => setTimeout(onClose, 3000)}
            onFailure={(err: Error) => console.error("Payment failed:", err)}
          />
        </div>
      </div>
    </div>
  );
}
