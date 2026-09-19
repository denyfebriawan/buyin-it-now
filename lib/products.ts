import "server-only";

import { prisma } from "@/lib/prisma";

export type { Product } from "@/generated/prisma/client";

export async function getProducts() {
  return prisma.product.findMany({ orderBy: { id: "asc" } });
}
