import { NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/products";

export async function POST(req: Request) {
  const { productId, quantity = 1 } = await req.json();

  const product = PRODUCTS[productId];
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const apiUrl = process.env.ADIPAY_API_URL ?? "http://localhost:3000";
  const apiKey = process.env.ADIPAY_API_KEY ?? "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "ADIPAY_API_KEY not set in .env.local" },
      { status: 500 }
    );
  }

  const fiatAmount = Math.round(product.price * quantity * 100);

  const res = await fetch(`${apiUrl}/payments/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      fiatAmount,
      fiatCurrency: product.currency,
      orderId: `test-${productId}-${Date.now()}`,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? "AdiPay API error" }, { status: 502 });
  }

  return NextResponse.json({
    sessionId: data.sessionId,
    apiUrl,
    product: {
      ...product,
      quantity,
      totalFormatted: `$${(product.price * quantity).toFixed(2)}`,
    },
    tokenAmountFormatted: data.tokenAmountFormatted,
    tokenSymbol: data.tokenSymbol,
  });
}
