import "@rainbow-me/rainbowkit/styles.css";

import { createRoot } from "react-dom/client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";

import { adiTestnet, adiMainnet } from "./chains";
import { AdiPayCheckout, type WidgetOptions } from "./AdiPayCheckout";

const DEFAULT_PROJECT_ID = "13023ac06bb20e4b24b1dd3cc0d248bb";

function createWidgetConfig(projectId: string) {
  return createConfig({
    chains: [adiTestnet, adiMainnet],
    connectors: [
      injected(),
      walletConnect({ projectId }),
    ],
    transports: {
      [adiTestnet.id]: http(),
      [adiMainnet.id]: http(),
    },
  });
}

function App(options: WidgetOptions) {
  const projectId = options.projectId ?? DEFAULT_PROJECT_ID;
  const config = createWidgetConfig(projectId);
  const queryClient = new QueryClient();
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

// ─── Public API ───────────────────────────────────────────────────────────────

const PayDI = {
  mount(selector: string | Element, options: WidgetOptions) {
    const container =
      typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!container) throw new Error(`PayDI: element not found: ${selector}`);

    const root = createRoot(container as HTMLElement);
    root.render(<App {...options} />);

    return { destroy: () => root.unmount() };
  },
};

const AdiPay = PayDI;

export { PayDI, AdiPay };
export default PayDI;
export type { WidgetOptions };

if (typeof window !== "undefined") {
  (window as unknown as { PayDI: typeof PayDI; AdiPay: typeof AdiPay }).PayDI = PayDI;
  (window as unknown as { PayDI: typeof PayDI; AdiPay: typeof AdiPay }).AdiPay = AdiPay;
}
