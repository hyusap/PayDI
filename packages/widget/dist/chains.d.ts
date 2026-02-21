export declare const adiLocal: {
    readonly id: 31337;
    readonly name: "ADI Local";
    readonly nativeCurrency: {
        readonly name: "ADI";
        readonly symbol: "ADI";
        readonly decimals: 18;
    };
    readonly rpcUrls: {
        readonly default: {
            readonly http: readonly ["http://localhost:8545"];
        };
    };
};
export declare const adiTestnet: {
    readonly id: 99999;
    readonly name: "ADI Chain Testnet";
    readonly nativeCurrency: {
        readonly name: "ADI";
        readonly symbol: "ADI";
        readonly decimals: 18;
    };
    readonly rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.ab.testnet.adifoundation.ai/"];
        };
    };
    readonly blockExplorers: {
        readonly default: {
            readonly name: "ADI Explorer";
            readonly url: "https://explorer.ab.testnet.adifoundation.ai";
        };
    };
};
export declare const adiMainnet: {
    readonly id: 36900;
    readonly name: "ADI Chain Mainnet";
    readonly nativeCurrency: {
        readonly name: "ADI";
        readonly symbol: "ADI";
        readonly decimals: 18;
    };
    readonly rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.adifoundation.ai/"];
        };
    };
    readonly blockExplorers: {
        readonly default: {
            readonly name: "ADI Explorer";
            readonly url: "https://explorer.adifoundation.ai";
        };
    };
};
