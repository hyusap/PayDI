import { type Chain } from "viem";

export const adiLocal = {
  id: 31337,
  name: "ADI Local",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost:8545"] } },
} as const satisfies Chain;

export const adiTestnet = {
  id: 99999,
  name: "ADI Chain Testnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ab.testnet.adifoundation.ai/"] } },
  blockExplorers: {
    default: { name: "ADI Explorer", url: "https://explorer.ab.testnet.adifoundation.ai" },
  },
} as const satisfies Chain;

export const adiMainnet = {
  id: 36900,
  name: "ADI Chain Mainnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.adifoundation.ai/"] } },
  blockExplorers: {
    default: { name: "ADI Explorer", url: "https://explorer.adifoundation.ai" },
  },
} as const satisfies Chain;
