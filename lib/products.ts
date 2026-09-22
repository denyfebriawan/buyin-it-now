import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { escapeLike } from "@/lib/db";
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

export type ProductSort = "newest" | "price-asc" | "price-desc";

export const PRODUCTS_PER_PAGE = 12;

// The shop only ever shows products that are on sale. An archived product
// (archivedAt is set) is treated as if it did not exist: it is not listed and
// its page is a 404. The admin area reads products through lib/admin-products.ts.
//
// One page of the catalog, using the same bookmark (keyset) paging as every
// other list in this app: pass the last product you saw as `before` to get
// the ones after it. `search` matches the name (case-insensitive, substring).
//
// Sorting by newest uses a single-column bookmark (id), the same as
// everywhere else, because id order IS newest-first. Sorting by price cannot:
// many products can share a price, so "price less than $19.99" alone would
// skip or repeat products sitting at exactly $19.99. The bookmark has to be
// the PAIR (price, id) together — "the next product after this exact price
// and id" — which is why beforePriceCents exists alongside before only for
// the price sorts.
export async function getProducts({
  search,
  sort = "newest",
  before,
  beforePriceCents,
}: {
  search?: string;
  sort?: ProductSort;
  before?: number;
  beforePriceCents?: number;
} = {}) {
  let cursor: Prisma.ProductWhereInput = {};
  if (sort === "newest") {
    if (before !== undefined) cursor = { id: { lt: before } };
  } else if (before !== undefined && beforePriceCents !== undefined) {
    // What a raw SQL row comparison `WHERE (price_cents, id) > ($1, $2)` means,
    // written the only way Prisma's query builder can express it: Postgres
    // treats the two as identical. Either the price is strictly past the
    // bookmark, or it's tied and the id (which is always unique) breaks the
    // tie. The direction flips for descending.
    cursor =
      sort === "price-asc"
        ? {
            OR: [
              { priceCents: { gt: beforePriceCents } },
              { priceCents: beforePriceCents, id: { gt: before } },
            ],
          }
        : {
            OR: [
              { priceCents: { lt: beforePriceCents } },
              { priceCents: beforePriceCents, id: { lt: before } },
            ],
          };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === "newest"
      ? [{ id: "desc" }]
      : sort === "price-asc"
        ? [{ priceCents: "asc" }, { id: "asc" }]
        : [{ priceCents: "desc" }, { id: "desc" }];

  const rows = await prisma.product.findMany({
    where: {
      archivedAt: null,
      ...(search ? { name: { contains: escapeLike(search), mode: "insensitive" } } : {}),
      ...cursor,
    },
    orderBy,
    take: PRODUCTS_PER_PAGE + 1,
  });

  const hasMore = rows.length > PRODUCTS_PER_PAGE;
  const products = hasMore ? rows.slice(0, PRODUCTS_PER_PAGE) : rows;
  const last = products.at(-1);

  return {
    products,
    nextCursor:
      hasMore && last ? { before: last.id, beforePriceCents: last.priceCents } : null,
  };
}

// cache() remembers the result for the rest of the current request. The page
// and its generateMetadata function both call this, so the query runs once.
export const getProductById = cache(async (id: number) => {
  return prisma.product.findFirst({ where: { id, archivedAt: null } });
});
