import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type { Product } from "@/generated/prisma/client";

// A Postgres INTEGER column holds at most 2^31 - 1. A larger id would make the
// query throw instead of simply finding nothing.
const MAX_INT = 2_147_483_647;

// Turns a URL segment like "12" into 12. Anything else ("abc", "0", "-1",
// "1.5", a huge number) returns null, meaning "no such product".
export function parseProductId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && id <= MAX_INT ? id : null;
}

// The shop only ever shows products that are on sale. An archived product
// (archivedAt is set) is treated as if it did not exist: it is not listed and
// its page is a 404. The admin area reads products through lib/admin-products.ts.
export async function getProducts() {
  return prisma.product.findMany({
    where: { archivedAt: null },
    orderBy: { id: "asc" },
  });
}

// cache() remembers the result for the rest of the current request. The page
// and its generateMetadata function both call this, so the query runs once.
export const getProductById = cache(async (id: number) => {
  return prisma.product.findFirst({ where: { id, archivedAt: null } });
});
