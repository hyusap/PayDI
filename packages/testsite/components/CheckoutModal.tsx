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
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8 text-black/45">Loading payment...</div> }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#eeeeee] bg-white shadow-xl shadow-black/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eeeeee] bg-[#fafafa] p-5">
          <h2 className="text-lg font-normal tracking-[-0.18px] text-black">PayDI Checkout</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#eeeeee] text-black/50 transition-colors hover:border-[#003cff55] hover:text-[#003cff]"
          >
            ✕
          </button>
        </div>

        {/* Order summary */}
        <div className="mx-5 mt-4 rounded-xl border border-[#003cff1a] bg-[#003cff0d] p-4 text-sm">
          <div className="mb-2 flex justify-between text-black/55">
            <span>{data.product.emoji} {data.product.name}</span>
            <span>×{data.product.quantity}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[#003cff1a] pt-3 text-base font-medium text-black">
            <span>Total</span>
            <span>{data.product.totalFormatted} ≈ {data.tokenAmountFormatted} {data.tokenSymbol}</span>
          </div>
        </div>

        {/* Widget */}
        <div className="p-5">
          <PayDIWidget
            sessionId={data.sessionId}
            apiUrl={data.apiUrl}
            theme="light"
            onSuccess={() => setTimeout(onClose, 3000)}
            onFailure={(err: Error) => console.error("Payment failed:", err)}
          />
        </div>
      </div>
    </div>
  );
}
