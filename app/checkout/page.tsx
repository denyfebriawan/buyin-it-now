import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PlaceOrderForm } from "@/components/place-order-form";
import { buttonVariants } from "@/components/ui/button";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
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
          Add something to your cart before checking out.
        </p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>
          Browse products
        </Link>
      </div>
    );
  }

  // Warn before the click. The stock can still change between this page loading
  // and the button being pressed, so the action's answer is the one that counts.
  const problems = items.filter(
    (item) => item.product.stock === 0 || item.quantity > item.product.stock,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      <ul className="mt-6 divide-y border-y">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={item.product.imageUrl}
                alt={item.product.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.product.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.quantity} × {formatPrice(item.product.priceCents)}
              </p>
            </div>
            <p className="font-medium tabular-nums">
              {formatPrice(item.quantity * item.product.priceCents)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Payment is simulated in this demo. No money is charged.
      </p>

      {problems.length > 0 && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          <p>Fix these items in your cart before you can place the order:</p>
          <ul className="mt-2 list-disc pl-5">
            {problems.map((item) => (
              <li key={item.id}>
                {item.product.name}:{" "}
                {item.product.stock === 0
                  ? "sold out"
                  : `only ${item.product.stock} left, you have ${item.quantity}`}
              </li>
            ))}
          </ul>
          <Link href="/cart" className="mt-2 inline-block underline">
            Go to your cart
          </Link>
        </div>
      )}

      <div className="mt-6">
        <PlaceOrderForm
          expectedTotalCents={subtotalCents}
          disabled={problems.length > 0}
        />
      </div>
    </div>
  );
}
