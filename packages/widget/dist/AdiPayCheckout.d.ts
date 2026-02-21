export interface WidgetOptions {
    sessionId: string;
    apiUrl: string;
    projectId?: string;
    theme?: "light" | "dark";
    onSuccess?: (txHash: string) => void;
    onFailure?: (err: Error) => void;
}
export declare function AdiPayCheckout({ sessionId, apiUrl, onSuccess, onFailure }: WidgetOptions): import("react/jsx-runtime").JSX.Element;
