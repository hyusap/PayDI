"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import "@rainbow-me/rainbowkit/styles.css";
import { useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { adiTestnet, adiMainnet } from "./chains";
import { AdiPayCheckout } from "./AdiPayCheckout";
const DEFAULT_PROJECT_ID = "13023ac06bb20e4b24b1dd3cc0d248bb";
function createWidgetConfig(projectId) {
    return createConfig({
        chains: [adiTestnet, adiMainnet],
        connectors: [injected(), walletConnect({ projectId })],
        transports: {
            [adiTestnet.id]: http(),
            [adiMainnet.id]: http(),
        },
    });
}
export function PayDIWidget(options) {
    const projectId = options.projectId ?? DEFAULT_PROJECT_ID;
    const [config] = useState(() => createWidgetConfig(projectId));
    const [queryClient] = useState(() => new QueryClient());
    const rkTheme = options.theme === "dark" ? darkTheme() : lightTheme();
    return (_jsx(WagmiProvider, { config: config, children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(RainbowKitProvider, { theme: rkTheme, children: _jsx(AdiPayCheckout, { ...options }) }) }) }));
}
//# sourceMappingURL=PayDIWidget.js.map