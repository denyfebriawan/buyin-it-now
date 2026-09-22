import "server-only";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_STOCK } from "@/lib/validation/product";

// Everything the admin does to products lives here. Every function starts with
// requireAdmin(): the layout's check only keeps customers from seeing the admin
// pages, it cannot protect a Server Action that someone posts to directly.
// Unlike the shop (lib/products.ts) these see archived products too.

export const ADMIN_PRODUCTS_PER_PAGE = 20;

// In a LIKE pattern, % means "anything" and _ means "any one character".
// Prisma's `contains` does not escape them (the value is only wrapped in %...%),
// so typing "%" would match every product. Putting a backslash in front makes
// them ordinary characters; the backslash itself needs escaping first.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

export type ProductStatusFilter = "active" | "archived";

// One page of products, newest first, using the same bookmark (keyset) paging as
// the order history: pass the id of the last product you saw as `before` to get
// older ones. It asks for one row more than a page; if that extra row exists
// there is a next page, and the bookmark for it is the last row that is shown.
//
// The name search uses ILIKE (case-insensitive, via `mode`). An ILIKE search
// cannot use a normal index, so it reads the whole table. That is fine for a
// catalog of thousands, and worth revisiting (pg_trgm) only if it grows far
// beyond that.
export async function getAdminProducts({
  status,
  search,
  before,
}: {
  status: ProductStatusFilter;
  search?: string;
  before?: number;
}) {
  await requireAdmin();

  const rows = await prisma.product.findMany({
    where: {
      archivedAt: status === "archived" ? { not: null } : null,
      ...(search
        ? { name: { contains: escapeLike(search), mode: "insensitive" } }
        : {}),
      ...(before ? { id: { lt: before } } : {}),
    },
    orderBy: { id: "desc" },
    take: ADMIN_PRODUCTS_PER_PAGE + 1,
  });

  const hasMore = rows.length > ADMIN_PRODUCTS_PER_PAGE;
  const products = hasMore ? rows.slice(0, ADMIN_PRODUCTS_PER_PAGE) : rows;

  return {
    products,
    nextBefore: hasMore ? products[products.length - 1].id : null,
  };
}

export async function getAdminProduct(id: number) {
  await requireAdmin();
  return prisma.product.findUnique({ where: { id } });
}

export type ProductInput = {
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
};

export async function createProduct(input: ProductInput & { stock: number }) {
  await requireAdmin();

  const product = await prisma.product.create({
    data: input,
    select: { id: true },
  });
  return product.id;
}

// Changes the descriptive fields and the price, and deliberately NOT the
// stock. Stock changes while the admin has the form open (customers keep
// buying), so saving a stale number from the form would silently wipe out those
// sales. Stock has its own atomic operation below.
//
// A price change is safe against a checkout happening at the same moment: the
// checkout reads and records the price in the same statement that takes the
// stock, and the buyer's expected-total check catches a change they didn't see.
//
// Returns false when there is no such product.
export async function updateProduct(
  id: number,
  input: ProductInput,
): Promise<boolean> {
  await requireAdmin();

  const { count } = await prisma.product.updateMany({
    where: { id },
    data: input,
  });
  return count > 0;
}

export type AdjustStockResult =
  | { ok: true; stock: number }
  | { ok: false; reason: "not-found" | "below-zero" | "too-many" };

// Changes the stock BY an amount instead of setting it to a total. The
// database does the arithmetic in one statement, so a sale that happens while
// the admin is typing is never overwritten: "+20" on a product that just sold 3
// gives (old stock - 3 + 20). The WHERE clause refuses a change that would make
// the stock negative or absurdly large, and RETURNING hands back the result.
export async function adjustStock(
  id: number,
  delta: number,
): Promise<AdjustStockResult> {
  await requireAdmin();

  const rows = await prisma.$queryRaw<{ stock: number }[]>`
    UPDATE products
    SET stock = stock + ${delta}::int
    WHERE id = ${id}::int
      AND stock + ${delta}::int >= 0
      AND stock + ${delta}::int <= ${MAX_STOCK}::int
    RETURNING stock
  `;

  if (rows.length > 0) return { ok: true, stock: rows[0].stock };

  // Nothing changed. Only now spend a second query to say why.
  const product = await prisma.product.findUnique({
    where: { id },
    select: { stock: true },
  });
  if (!product) return { ok: false, reason: "not-found" };
  return {
    ok: false,
    reason: product.stock + delta < 0 ? "below-zero" : "too-many",
  };
}

// Takes a product off sale. It is not deleted: past orders point at it, and the
// database refuses to delete a product that was ever ordered. It also leaves
// every customer's cart in the same transaction, so nobody keeps something they
// can no longer buy. Archiving twice is harmless.
export async function archiveProduct(id: number): Promise<void> {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.product.updateMany({
      where: { id, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (count > 0) await tx.cartItem.deleteMany({ where: { productId: id } });
  });
}

// Puts an archived product back on sale, with the stock it had.
export async function restoreProduct(id: number): Promise<void> {
  await requireAdmin();

  await prisma.product.updateMany({
    where: { id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
}
