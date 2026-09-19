export type Product = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
};

// Temporary hardcoded data. It will be replaced by a database query.
const products: Product[] = [
  {
    id: 1,
    name: "Classic Cotton Tee",
    description: "Soft, heavyweight cotton t-shirt in a relaxed fit.",
    priceCents: 2400,
    imageUrl: "https://picsum.photos/seed/cotton-tee/600/600",
    stock: 42,
  },
  {
    id: 2,
    name: "Canvas Sneakers",
    description: "Lightweight low-top sneakers with a cushioned sole.",
    priceCents: 6500,
    imageUrl: "https://picsum.photos/seed/canvas-sneakers/600/600",
    stock: 18,
  },
  {
    id: 3,
    name: "Leather Wallet",
    description: "Slim bifold wallet made from full-grain leather.",
    priceCents: 3900,
    imageUrl: "https://picsum.photos/seed/leather-wallet/600/600",
    stock: 4,
  },
  {
    id: 4,
    name: "Wireless Earbuds",
    description: "Bluetooth earbuds with 24-hour battery life in the case.",
    priceCents: 7999,
    imageUrl: "https://picsum.photos/seed/wireless-earbuds/600/600",
    stock: 0,
  },
  {
    id: 5,
    name: "Ceramic Mug",
    description: "Hand-glazed 12 oz mug, dishwasher and microwave safe.",
    priceCents: 1800,
    imageUrl: "https://picsum.photos/seed/ceramic-mug/600/600",
    stock: 65,
  },
  {
    id: 6,
    name: "Denim Jacket",
    description: "Classic trucker jacket in washed indigo denim.",
    priceCents: 8900,
    imageUrl: "https://picsum.photos/seed/denim-jacket/600/600",
    stock: 9,
  },
  {
    id: 7,
    name: "Travel Backpack",
    description: "25L water-resistant backpack with a padded laptop sleeve.",
    priceCents: 5400,
    imageUrl: "https://picsum.photos/seed/travel-backpack/600/600",
    stock: 3,
  },
  {
    id: 8,
    name: "Desk Lamp",
    description: "Adjustable LED lamp with three brightness levels.",
    priceCents: 3200,
    imageUrl: "https://picsum.photos/seed/desk-lamp/600/600",
    stock: 27,
  },
];

// Async on purpose: this will become a database call, and the pages that use
// it won't need to change.
export async function getProducts(): Promise<Product[]> {
  return products;
}
