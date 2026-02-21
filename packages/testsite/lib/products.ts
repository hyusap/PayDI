export interface Product {
  name: string;
  price: number; // USD dollars
  currency: "USD";
  emoji: string;
  description: string;
}

export const PRODUCTS: Record<string, Product> = {
  "adi-tee": {
    name: "ADI Chain T-Shirt",
    price: 25,
    currency: "USD",
    emoji: "👕",
    description: "100% cotton, GPU-powered comfort",
  },
  "adi-hoodie": {
    name: "ADI Foundation Hoodie",
    price: 65,
    currency: "USD",
    emoji: "🧥",
    description: "Stay warm while your validator runs",
  },
  "sticker-pack": {
    name: "Developer Sticker Pack",
    price: 5,
    currency: "USD",
    emoji: "🎨",
    description: "12 stickers for your laptop",
  },
  "adi-cap": {
    name: "ADI Chain Cap",
    price: 30,
    currency: "USD",
    emoji: "🧢",
    description: "Structured fit, embroidered logo",
  },
};
