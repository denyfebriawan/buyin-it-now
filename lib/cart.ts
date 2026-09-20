import "server-only";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Every function here calls requireUser() itself and only ever touches the
// current user's rows, so no caller can forget the login check or reach
// someone else's cart. Prices are never stored or accepted here: they are read
// from the products table each time, so a request can only name a product and
// a quantity.

export async function getCart() {
  const user = await requireUser();

  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    orderBy: { id: "asc" },
    select: {
      id: true,
      quantity: true,
      product: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          imageUrl: true,
          stock: true,
        },
      },
    },
  });

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.quantity * item.product.priceCents,
    0,
  );

  return { items, subtotalCents };
}

export type AddToCartResult =
  | { ok: true; quantity: number }
  | { ok: false; reason: "not-found" | "out-of-stock" };

// Adds `quantity` of a product, or creates the row if this is the first one.
// On success it returns the cart line's final quantity, which can be lower than
// what was asked for when the stock cap applied.
//
// It is one SQL statement on purpose. Reading the quantity, adding in
// JavaScript and writing it back loses updates: two simultaneous clicks both
// read 3, both write 4, and one add vanishes. Here the database does the
// arithmetic itself, and the unique (user_id, product_id) index turns a second
// insert into an update (ON CONFLICT). LEAST() caps the quantity at the
// product's stock in the same statement, and RETURNING hands back the result.
export async function addToCart(
  productId: number,
  quantity: number,
): Promise<AddToCartResult> {
  const user = await requireUser();

  const rows = await prisma.$queryRaw<{ quantity: number }[]>`
    INSERT INTO cart_items (user_id, product_id, quantity)
    SELECT ${user.id}::int, p.id, LEAST(${quantity}::int, p.stock)
    FROM products p
    WHERE p.id = ${productId}::int AND p.stock > 0
    ON CONFLICT (user_id, product_id) DO UPDATE
      SET quantity = LEAST(
        cart_items.quantity + ${quantity}::int,
        (SELECT stock FROM products WHERE id = cart_items.product_id)
      )
      -- If the stock hit 0 after the insert check, skip the update: a
      -- quantity of 0 would break the table's quantity > 0 rule.
      WHERE (SELECT stock FROM products WHERE id = cart_items.product_id) > 0
    RETURNING quantity
  `;

  // RETURNING only yields a row when something was inserted or updated.
  if (rows.length > 0) return { ok: true, quantity: rows[0].quantity };

  // No row came back, so the product is missing or has no stock. Only now do
  // we spend a second query to tell the two cases apart for the message.
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  return { ok: false, reason: product ? "out-of-stock" : "not-found" };
}

// Sets a cart line to an exact quantity (capped at stock). The user's id is in
// the WHERE clause, so a made-up or someone else's cartItemId matches nothing:
// that is what stops a user editing another user's cart. Returns false when no
// row was changed.
export async function setCartItemQuantity(
  cartItemId: number,
  quantity: number,
): Promise<boolean> {
  const user = await requireUser();

  const affected = await prisma.$executeRaw`
    UPDATE cart_items ci
    SET quantity = LEAST(${quantity}::int, p.stock)
    FROM products p
    WHERE ci.id = ${cartItemId}::int
      AND ci.user_id = ${user.id}::int
      AND p.id = ci.product_id
      AND p.stock > 0
  `;

  return affected > 0;
}

// Same ownership rule as above. Removing a line that is already gone is fine,
// so this never throws for a missing row. Returns how many rows were removed.
export async function removeCartItem(cartItemId: number): Promise<number> {
  const user = await requireUser();

  const { count } = await prisma.cartItem.deleteMany({
    where: { id: cartItemId, userId: user.id },
  });

  return count;
}
