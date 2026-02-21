export const LLMS_INSTRUCTIONS = `# PayDI Integration Instructions

Use these instructions to integrate the PayDI checkout widget into your app.

## 1) Install

\`\`\`bash
bun add paydi-widget
\`\`\`

Peer dependencies required in the host app:

- react
- react-dom
- wagmi
- viem
- @tanstack/react-query
- @rainbow-me/rainbowkit

## 2) Create a payment session on your backend

Call your PayDI API to create a checkout session. Save the returned \`sessionId\` and pass it to the widget.

## 3) Render the widget in React / Next.js

\`\`\`tsx
"use client";

import { PayDIWidget } from "paydi-widget";

export function CheckoutPanel() {
  return (
    <PayDIWidget
      sessionId="<SESSION_ID_FROM_API>"
      apiUrl="https://your-api.example.com"
      theme="light"
      onSuccess={(txHash) => {
        console.log("Payment confirmed:", txHash);
      }}
      onFailure={(err) => {
        console.error("Payment failed:", err);
      }}
    />
  );
}
\`\`\`

## 4) Next.js SSR-safe import (recommended)

\`\`\`tsx
"use client";

import dynamic from "next/dynamic";

const PayDIWidget = dynamic(
  () => import("paydi-widget").then((m) => m.PayDIWidget),
  { ssr: false }
);
\`\`\`

## 5) Widget options reference

- \`sessionId: string\` - required; payment session id
- \`apiUrl: string\` - required; PayDI API base URL
- \`projectId?: string\` - optional WalletConnect project id
- \`theme?: "light" | "dark"\` - optional visual theme
- \`onSuccess?: (txHash: string) => void\` - called when confirmed
- \`onFailure?: (err: Error) => void\` - called on tx/send failure

## 6) Integration checklist

- Make sure your backend can create and serve payment sessions.
- Pass the exact \`sessionId\` returned by your API.
- Keep \`apiUrl\` environment-specific (dev/staging/prod).
- Use client-only rendering for Next.js app router pages.
- Handle \`onSuccess\` to mark orders paid in your system.
`;
