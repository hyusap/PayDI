"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { adiTestnet, adiMainnet } from "./chains";
import { AdiPayCheckout, type WidgetOptions } from "./AdiPayCheckout";

export type { WidgetOptions };

const DEFAULT_PROJECT_ID = "13023ac06bb20e4b24b1dd3cc0d248bb";

function createWidgetConfig(projectId: string) {
  return createConfig({
    chains: [adiTestnet, adiMainnet],
    connectors: [injected(), walletConnect({ projectId })],
    transports: {
      [adiTestnet.id]: http(),
      [adiMainnet.id]: http(),
    },
  });
}

export function PayDIWidget(options: WidgetOptions) {
  const projectId = options.projectId ?? DEFAULT_PROJECT_ID;
  const [config] = useState(() => createWidgetConfig(projectId));
  const [queryClient] = useState(() => new QueryClient());
  const rkTheme = options.theme === "dark" ? darkTheme() : lightTheme();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rkTheme}>
          <AdiPayCheckout {...options} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
