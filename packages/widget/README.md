# PayDI Widget

Embeddable React checkout widget for ADI Chain payments.

## What this package provides

- A drop-in `PayDIWidget` React component for wallet connect + checkout
- Built-in wallet stack using wagmi + RainbowKit + WalletConnect
- Payment flow states (loading, connect wallet, confirm, pending, success, failed, expired)

## Install

```bash
bun add paydi-widget
```

This package has peer dependencies:

- `react`
- `react-dom`
- `wagmi`
- `viem`
- `@tanstack/react-query`
- `@rainbow-me/rainbowkit`

## Basic usage (React / Next.js)

```tsx
"use client";

import { PayDIWidget } from "paydi-widget";

export function Checkout() {
  return (
    <PayDIWidget
      sessionId="0x6f..."
      apiUrl="https://api.example.com"
      theme="dark"
      onSuccess={(txHash) => console.log("Paid", txHash)}
      onFailure={(err) => console.error("Payment failed", err)}
    />
  );
}
```

## Next.js SSR note

For App Router / SSR projects, render the widget on the client only:

```tsx
"use client";

import dynamic from "next/dynamic";

const PayDIWidget = dynamic(
  () => import("paydi-widget").then((m) => m.PayDIWidget),
  { ssr: false }
);
```

## API

`PayDIWidget` props (`WidgetOptions`):

- `sessionId: string` - payment session id returned by `POST /payments/sessions`
- `apiUrl: string` - base URL of your AdiPay API instance
- `projectId?: string` - optional WalletConnect project id
- `theme?: "light" | "dark"` - visual theme (default: `light`)
- `onSuccess?: (txHash: string) => void` - called when session is confirmed
- `onFailure?: (err: Error) => void` - called on transaction/send failures

## Exports

- `PayDIWidget` (primary)
- `WidgetOptions` (type)

## Local development

From the monorepo root:

```bash
bun install
bun run build:widget
bun run dev:testsite
```

Then open `http://localhost:3001` to test the widget in the local demo storefront.
