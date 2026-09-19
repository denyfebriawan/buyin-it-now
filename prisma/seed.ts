import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

// Placeholder photos from picsum.photos. Replace with real product images later.
const products: Prisma.ProductCreateManyInput[] = [
  {
    name: "Classic Cotton Tee",
    description: "Soft, heavyweight cotton t-shirt in a relaxed fit.",
    priceCents: 2400,
    imageUrl: "https://picsum.photos/seed/cotton-tee/600/600",
    stock: 42,
  },
  {
    name: "Canvas Sneakers",
    description: "Lightweight low-top sneakers with a cushioned sole.",
    priceCents: 6500,
    imageUrl: "https://picsum.photos/seed/canvas-sneakers/600/600",
    stock: 18,
  },
  {
    name: "Leather Wallet",
    description: "Slim bifold wallet made from full-grain leather.",
    priceCents: 3900,
    imageUrl: "https://picsum.photos/seed/leather-wallet/600/600",
    stock: 4,
  },
  {
    name: "Wireless Earbuds",
    description: "Bluetooth earbuds with 24-hour battery life in the case.",
    priceCents: 7999,
    imageUrl: "https://picsum.photos/seed/wireless-earbuds/600/600",
    stock: 0,
  },
  {
    name: "Ceramic Mug",
    description: "Hand-glazed 12 oz mug, dishwasher and microwave safe.",
    priceCents: 1800,
    imageUrl: "https://picsum.photos/seed/ceramic-mug/600/600",
    stock: 65,
  },
  {
    name: "Denim Jacket",
    description: "Classic trucker jacket in washed indigo denim.",
    priceCents: 8900,
    imageUrl: "https://picsum.photos/seed/denim-jacket/600/600",
    stock: 9,
  },
  {
    name: "Travel Backpack",
    description: "25L water-resistant backpack with a padded laptop sleeve.",
    priceCents: 5400,
    imageUrl: "https://picsum.photos/seed/travel-backpack/600/600",
    stock: 3,
  },
  {
    name: "Desk Lamp",
    description: "Adjustable LED lamp with three brightness levels.",
    priceCents: 3200,
    imageUrl: "https://picsum.photos/seed/desk-lamp/600/600",
    stock: 27,
  },
];

async function main() {
  // Only seed an empty table, so running this twice never creates duplicates.
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`Skipped: products already has ${existing} rows.`);
    return;
  }

  const result = await prisma.product.createMany({ data: products });
  console.log(`Seeded ${result.count} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
