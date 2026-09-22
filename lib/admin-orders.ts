import "server-only";

import type { OrderStatus } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { escapeLike } from "@/lib/db";
import { prisma } from "@/lib/prisma";

// Everything the admin does with orders lives here. Every function starts with
// requireAdmin(): the layout's check only keeps customers from seeing the admin
// pages, it cannot protect a Server Action that someone posts to directly.
// Unlike lib/orders.ts, these are not limited to the current user's own orders.

export const ADMIN_ORDERS_PER_PAGE = 20;

export type AdminOrderStatusFilter = OrderStatus | "all";

// A Postgres INTEGER holds at most 2^31 - 1.
const MAX_INT = 2_147_483_647;

// One page of every order, newest first, using the same bookmark (keyset)
// paging as the customer's own order history and the admin product list: pass
// the id of the last order you saw as `before` to get older ones.
//
// `search` matches the buyer's name or email (case-insensitive, substring), or
// the order id itself when the text is a plain number.
export async function getAdminOrders({
  status,
  search,
  before,
}: {
  status: AdminOrderStatusFilter;
  search?: string;
  before?: number;
}) {
  await requireAdmin();

  const searchId = search && /^\d+$/.test(search) ? Number(search) : null;

  const rows = await prisma.order.findMany({
    where: {
      ...(status !== "all" ? { status } : {}),
      ...(before ? { id: { lt: before } } : {}),
      ...(search
        ? {
            OR: [
              {
                user: {
                  email: { contains: escapeLike(search), mode: "insensitive" },
                },
              },
              {
                user: {
                  name: { contains: escapeLike(search), mode: "insensitive" },
                },
              },
              // A search of "7" should also find order #7, not just buyers
              // whose name or email happens to contain a "7".
              ...(searchId !== null && searchId > 0 && searchId <= MAX_INT
                ? [{ id: searchId }]
                : []),
            ],
          }
        : {}),
    },
    orderBy: { id: "desc" },
    take: ADMIN_ORDERS_PER_PAGE + 1,
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      items: { select: { quantity: true } },
    },
  });

  const hasMore = rows.length > ADMIN_ORDERS_PER_PAGE;
  const page = hasMore ? rows.slice(0, ADMIN_ORDERS_PER_PAGE) : rows;

  return {
    orders: page.map(({ items, ...order }) => ({
      ...order,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
    })),
    nextBefore: hasMore ? page[page.length - 1].id : null,
  };
}

// One order with its items and its buyer, no ownership check (unlike
// lib/orders.ts's getOrder, which only ever returns the current user's own).
export async function getAdminOrder(id: number) {
  await requireAdmin();

  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          unitPriceCents: true,
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
  });
}

export type CancelOrderResult =
  | { ok: true }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "wrong-status"; status: OrderStatus };

// Cancels an order and returns every item's quantity to stock. Only a PAID
// order can be cancelled: there is no real payment to refund (checkout creates
// orders already PAID), so this only ever represents "the sale is undone, put
// the stock back". A cancelled order stays cancelled; there is no "un-cancel",
// because bringing it back would mean re-running the stock and price checks
// that placeOrder() does, which is really placing a new order.
//
// The status change and the restock happen in one transaction, so a page load
// between them is impossible: an order is never seen as CANCELLED with its old
// stock still missing.
export async function cancelOrder(id: number): Promise<CancelOrderResult> {
  await requireAdmin();

  return prisma.$transaction(async (tx) => {
    // The WHERE clause only matches a PAID order, and locks that row while the
    // transaction runs. Two admins cancelling the same order at the same
    // moment cannot both succeed: whichever commits first leaves status
    // CANCELLED, so the second one's WHERE clause matches nothing.
    const { count } = await tx.order.updateMany({
      where: { id, status: "PAID" },
      data: { status: "CANCELLED" },
    });

    if (count === 0) {
      const order = await tx.order.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!order) return { ok: false, reason: "not-found" };
      return { ok: false, reason: "wrong-status", status: order.status };
    }

    const items = await tx.orderItem.findMany({
      where: { orderId: id },
      select: { productId: true, quantity: true },
    });

    // Same reason as placeOrder(): always touch products in the same order
    // (lowest id first), so two transactions that both touch two shared
    // products can never end up waiting for each other forever.
    items.sort((a, b) => a.productId - b.productId);

    for (const item of items) {
      // A single "increment" statement, not "read the stock, add, write it
      // back": that would lose a concurrent sale or admin stock change made to
      // the same product in between.
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return { ok: true };
  });
}
