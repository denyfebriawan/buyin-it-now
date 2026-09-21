import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/app/actions/cart";
import { SubmitButton } from "@/components/submit-button";
import { formatPrice } from "@/lib/format";
import type { CartLineData } from "@/lib/cart";
import { MAX_QUANTITY } from "@/lib/validation/cart";

// One row of the cart. The quantity buttons are tiny forms that send the NEW
// quantity (not "add one"), worked out here on the server. Pressing + twice
// quickly therefore posts "set to 4" twice instead of overshooting to 5.
export function CartLine({ item }: { item: CartLineData }) {
  const { id, quantity, product } = item;

  const soldOut = product.stock === 0;
  const overStock = !soldOut && quantity > product.stock;
  const limit = Math.min(product.stock, MAX_QUANTITY);
  const canDecrease = !soldOut && quantity > 1;
  const canIncrease = !soldOut && quantity < limit;

  return (
    <div className="flex gap-4 py-4">
      <Link
        href={`/products/${product.id}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="80px"
          className={
            soldOut ? "object-cover opacity-60 grayscale" : "object-cover"
          }
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/products/${product.id}`}
            className="font-medium hover:underline"
          >
            {product.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatPrice(product.priceCents)} each
          </p>
          {soldOut && (
            <p className="mt-1 text-sm text-destructive">
              Sold out. Remove it to continue.
            </p>
          )}
          {overStock && (
            <p className="mt-1 text-sm text-destructive">
              Only {product.stock} left. Reduce the quantity to continue.
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <form action={updateCartItemAction}>
              <input type="hidden" name="cartItemId" value={id} />
              <input type="hidden" name="quantity" value={quantity - 1} />
              <SubmitButton
                variant="outline"
                size="icon-sm"
                aria-label={`Decrease quantity of ${product.name}`}
                disabled={!canDecrease}
              >
                <Minus />
              </SubmitButton>
            </form>

            <span className="w-6 text-center tabular-nums" aria-label="Quantity">
              {quantity}
            </span>

            <form action={updateCartItemAction}>
              <input type="hidden" name="cartItemId" value={id} />
              <input type="hidden" name="quantity" value={quantity + 1} />
              <SubmitButton
                variant="outline"
                size="icon-sm"
                aria-label={`Increase quantity of ${product.name}`}
                disabled={!canIncrease}
              >
                <Plus />
              </SubmitButton>
            </form>
          </div>

          <p className="w-20 text-right font-medium tabular-nums">
            {formatPrice(quantity * product.priceCents)}
          </p>

          <form action={removeCartItemAction}>
            <input type="hidden" name="cartItemId" value={id} />
            <SubmitButton
              variant="ghost"
              size="sm"
              aria-label={`Remove ${product.name} from the cart`}
            >
              Remove
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
