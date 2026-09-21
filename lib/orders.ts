import "server-only";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type InsufficientItem = {
  productId: number;
  name: string;
  requested: number;
  available: number;
};

export type PlaceOrderResult =
  | { ok: true; orderId: number }
  | { ok: false; reason: "empty-cart" }
  | { ok: false; reason: "insufficient-stock"; items: InsufficientItem[] }
  | { ok: false; reason: "price-changed"; totalCents: number };

// Thrown inside the transaction to make it roll back. Anything thrown from the
// callback of $transaction() undoes every step taken so far.
class InsufficientStockError extends Error {
  constructor(readonly items: InsufficientItem[]) {
    super("Not enough stock");
  }
}

class PriceChangedError extends Error {
  constructor(readonly totalCents: number) {
    super("The total changed");
  }
}

// Turns the current user's cart into an order. The whole thing is ONE
// transaction: it either fully happens or leaves everything exactly as it was.
//
//   1. Take the cart (DELETE ... RETURNING). If it is empty, stop.
//   2. Take the stock, one product at a time, lowest product id first.
//   3. Create the order and its items, with the prices that were charged.
//   4. Commit: stock is lower, the order exists and the cart is empty.
//
// Payment is simulated: the order is created already PAID.
//
// expectedTotalCents is the total the buyer saw on the checkout page. If the
// real total is different (a price or the cart changed in the meantime) the
// order is refused, so nobody is charged an amount they did not see. It is only
// ever compared, never used to price anything, so forging it cannot give a
// discount: the worst it can do is make the order fail.
export async function placeOrder(
  expectedTotalCents?: number,
): Promise<PlaceOrderResult> {
  const user = await requireUser();

  try {
    return await prisma.$transaction(
      async (tx): Promise<PlaceOrderResult> => {
        // 1. Deleting the cart rows first is what makes a double click (or a
        //    retried request) safe. A second checkout for the same user has to
        //    wait for this transaction, and then finds the cart already gone.
        //    If a later step fails, the rollback puts the cart back.
        const lines = await tx.$queryRaw<
          { product_id: number; quantity: number }[]
        >`
          DELETE FROM cart_items
          WHERE user_id = ${user.id}::int
          RETURNING product_id, quantity
        `;

        if (lines.length === 0) return { ok: false, reason: "empty-cart" };

        // 2. Always lock products in the same order (lowest id first). If two
        //    checkouts locked the same two products in opposite orders, each
        //    could end up waiting for the other forever (a deadlock).
        lines.sort((a, b) => a.product_id - b.product_id);

        const bought: {
          productId: number;
          quantity: number;
          unitPriceCents: number;
        }[] = [];
        const short: InsufficientItem[] = [];

        for (const line of lines) {
          // The stock check and the stock change are ONE statement. The row
          // is locked while it runs, so two buyers cannot both take the last
          // unit: the second one updates zero rows. RETURNING gives the price
          // at that exact moment, which is the price we charge and record.
          const updated = await tx.$queryRaw<{ price_cents: number }[]>`
            UPDATE products
            SET stock = stock - ${line.quantity}::int
            WHERE id = ${line.product_id}::int
              AND stock >= ${line.quantity}::int
            RETURNING price_cents
          `;

          if (updated.length === 0) {
            const product = await tx.product.findUnique({
              where: { id: line.product_id },
              select: { name: true, stock: true },
            });
            short.push({
              productId: line.product_id,
              name: product?.name ?? "Unknown product",
              requested: line.quantity,
              available: product?.stock ?? 0,
            });
          } else {
            bought.push({
              productId: line.product_id,
              quantity: line.quantity,
              unitPriceCents: updated[0].price_cents,
            });
          }
        }

        // Report every problem at once, and undo everything (including the
        // stock already taken for the other lines and the deleted cart).
        if (short.length > 0) throw new InsufficientStockError(short);

        // 3. The total is worked out here from the recorded prices, never
        //    accepted from the client.
        const totalCents = bought.reduce(
          (sum, item) => sum + item.quantity * item.unitPriceCents,
          0,
        );

        if (
          expectedTotalCents !== undefined &&
          totalCents !== expectedTotalCents
        ) {
          throw new PriceChangedError(totalCents);
        }

        const order = await tx.order.create({
          data: {
            userId: user.id,
            status: "PAID",
            totalCents,
            items: { create: bought },
          },
          select: { id: true },
        });

        return { ok: true, orderId: order.id };
      },
      // Buyers of a popular product wait for each other's row lock, so give
      // the transaction more room than the 2 s / 5 s defaults.
      { maxWait: 10_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { ok: false, reason: "insufficient-stock", items: error.items };
    }
    if (error instanceof PriceChangedError) {
      return { ok: false, reason: "price-changed", totalCents: error.totalCents };
    }
    throw error;
  }
}

// One order with its items, but only if it belongs to the current user. The
// user's id is part of the query, so someone else's order and an order that
// does not exist look exactly the same (null): nobody can learn which ids exist.
// Prices are the ones recorded when the order was placed, not today's prices.
export async function getOrder(orderId: number) {
  const user = await requireUser();

  return prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
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
