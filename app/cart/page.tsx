import type { Metadata } from "next";
import Link from "next/link";

import { CartLine } from "@/components/cart-line";
import { buttonVariants } from "@/components/ui/button";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  // getCart() checks the login itself, so anonymous visitors are redirected to
  // /login before anything here runs.
  const { items, subtotalCents } = await getCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your cart is empty
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse the catalog and add something you like.
        </p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>

      <ul className="mt-6 divide-y border-y">
        {items.map((item) => (
          <li key={item.id}>
            <CartLine item={item} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between text-lg font-semibold">
        <span>Subtotal</span>
        <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
      </div>

      <Link
        href="/checkout"
        className={buttonVariants({ size: "lg", className: "mt-4 w-full" })}
      >
        Checkout
      </Link>
    </div>
  );
}
