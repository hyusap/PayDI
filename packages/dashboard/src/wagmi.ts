import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { type Chain } from "viem";

export const adiLocal: Chain = {
  id: 31337,
  name: "ADI Local",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://localhost:8545"] },
    public: { http: ["http://localhost:8545"] },
  },
  testnet: true,
};

export const adiTestnet: Chain = {
  id: 99999,
  name: "ADI Chain Testnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.ab.testnet.adifoundation.ai/"] },
    public: { http: ["https://rpc.ab.testnet.adifoundation.ai/"] },
  },
  blockExplorers: {
    default: {
      name: "ADI Explorer",
      url: "https://explorer.ab.testnet.adifoundation.ai",
    },
  },
  testnet: true,
};

export const adiMainnet: Chain = {
  id: 36900,
  name: "ADI Chain Mainnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.adifoundation.ai/"] },
    public: { http: ["https://rpc.adifoundation.ai/"] },
  },
  blockExplorers: {
    default: {
      name: "ADI Explorer",
      url: "https://explorer.adifoundation.ai",
    },
  },
};

export const EXPLORER_BY_CHAIN: Record<number, string> = {
  31337: "", // no explorer for local
  99999: "https://explorer.ab.testnet.adifoundation.ai",
  36900: "https://explorer.adifoundation.ai",
};

export const config = getDefaultConfig({
  appName: "AdiPay Dashboard",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    "13023ac06bb20e4b24b1dd3cc0d248bb",
  chains: [adiLocal, adiTestnet, adiMainnet],
  ssr: true,
});
