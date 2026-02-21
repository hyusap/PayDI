export const adiLocal = {
    id: 31337,
    name: "ADI Local",
    nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
    rpcUrls: { default: { http: ["http://localhost:8545"] } },
};
export const adiTestnet = {
    id: 99999,
    name: "ADI Chain Testnet",
    nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.ab.testnet.adifoundation.ai/"] } },
    blockExplorers: {
        default: { name: "ADI Explorer", url: "https://explorer.ab.testnet.adifoundation.ai" },
    },
};
export const adiMainnet = {
    id: 36900,
    name: "ADI Chain Mainnet",
    nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.adifoundation.ai/"] } },
    blockExplorers: {
        default: { name: "ADI Explorer", url: "https://explorer.adifoundation.ai" },
    },
};
//# sourceMappingURL=chains.js.map