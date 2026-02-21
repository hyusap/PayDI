// Price service — GeckoTerminal token quote with fallback to env-configured mock price

interface CachedPrice {
  value: number;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CachedPrice>();

const GECKOTERMINAL_ADI_TOKEN_URL =
  "https://api.geckoterminal.com/api/v2/networks/eth/tokens/0x8b1484d57abbe239bb280661377363b03c89caea";

// Fallback mock prices (used when GeckoTerminal is unavailable)
// Set ADI_PRICE_USD in .env to override. Default: 1 ADI = $0.10
const MOCK_ADI_USD = parseFloat(process.env.ADI_PRICE_USD ?? "0.10");
const USD_AED_RATE = parseFloat(process.env.USD_AED_RATE ?? "3.67");
const MOCK_ADI_AED = MOCK_ADI_USD * USD_AED_RATE;

async function fetchAdiUsdPrice(): Promise<number> {
  const key = "ADI/USD";
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.value;

  const res = await fetch(GECKOTERMINAL_ADI_TOKEN_URL);
  if (!res.ok) throw new Error(`GeckoTerminal ${key}: ${res.status}`);

  const json = await res.json() as {
    data?: { attributes?: { price_usd?: string } };
  };
  const value = parseFloat(json.data?.attributes?.price_usd ?? "");
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`GeckoTerminal ${key}: missing/invalid price_usd`);
  }

  cache.set(key, { value, fetchedAt: Date.now() });
  return value;
}

export async function getAdiPrices(): Promise<{ usd: number; aed: number; source: string }> {
  try {
    const usd = await fetchAdiUsdPrice();
    const aed = usd * USD_AED_RATE;
    return { usd, aed, source: "geckoterminal" };
  } catch (err) {
    console.warn(`[price] GeckoTerminal unavailable (${(err as Error).message}), using mock price: 1 ADI = $${MOCK_ADI_USD}`);
    return { usd: MOCK_ADI_USD, aed: MOCK_ADI_AED, source: "mock" };
  }
}

export async function fiatToAdi(fiatAmount: number, fiatCurrency: "AED" | "USD"): Promise<bigint> {
  const prices = await getAdiPrices();
  const fiatDecimal = fiatAmount / 100;
  const fiatPerAdi = fiatCurrency === "AED" ? prices.aed : prices.usd;
  const adiAmount = fiatDecimal / fiatPerAdi;
  return BigInt(Math.round(adiAmount * 1e18));
}

export function getPriceCache() {
  return Object.fromEntries(
    [...cache.entries()].map(([k, v]) => [k, { value: v.value, age: Date.now() - v.fetchedAt }])
  );
}
