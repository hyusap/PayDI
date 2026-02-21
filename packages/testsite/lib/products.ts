export interface Product {
  name: string;
  price: number; // USD dollars
  currency: "USD";
  emoji: string;
  description: string;
}

export const PRODUCTS: Record<string, Product> = {
  "adi-tee": {
    name: "PayDI T-Shirt",
    price: 0.1,
    currency: "USD",
    emoji: "👕",
    description: "100% cotton, GPU-powered comfort",
  },
  "adi-hoodie": {
    name: "PayDI Hoodie",
    price: 0.2,
    currency: "USD",
    emoji: "🧥",
    description: "Stay warm while your validator runs",
  },
  "sticker-pack": {
    name: "PayDI Sticker Pack",
    price: 0.05,
    currency: "USD",
    emoji: "🎨",
    description: "12 stickers for your laptop",
  },
  "adi-cap": {
    name: "PayDI Cap",
    price: 0.08,
    currency: "USD",
    emoji: "🧢",
    description: "Structured fit, embroidered logo",
  },
};
