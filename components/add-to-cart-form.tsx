"use client";

import { useActionState, type ChangeEvent } from "react";

import { addToCartAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The product page (a Server Component) renders this small client piece and
// passes it plain values. maxQuantity is how many MORE can be added (the
// stock minus what is already in the cart), worked out on the server, so this
// file does not need the validation code or a database.
export function AddToCartForm({
  productId,
  maxQuantity,
  inCart,
}: {
  productId: number;
  maxQuantity: number;
  inCart: number;
}) {
  const [state, formAction, pending] = useActionState(
    addToCartAction,
    undefined,
  );

  // Keeps the typed number inside 1..maxQuantity as it is typed, so the
  // browser's own "value must be at most N" popup never has to appear. Typing
  // 50 when 10 are left simply becomes 10. The server still caps the quantity
  // itself, because a request can bypass this page.
  function keepInRange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    if (input.value === "") return; // let people clear the box while typing
    const whole = Math.floor(Number(input.value));
    const clamped = Math.min(Math.max(whole, 1), maxQuantity);
    if (String(clamped) !== input.value) input.value = String(clamped);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />

      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          {/* The key changes after every result, which puts the box back to 1
              and picks up the new maximum. */}
          <Input
            key={state?.message ?? "initial"}
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity}
            defaultValue={1}
            onChange={keepInRange}
            required
            className="w-24"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Adding..." : "Add to cart"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {inCart > 0
          ? `${inCart} already in your cart. You can add up to ${maxQuantity} more.`
          : `You can add up to ${maxQuantity}.`}
      </p>

      {/* Always in the page, so screen readers announce it when the text
          changes. Errors are red; a success message keeps the normal colour. */}
      <p
        role="status"
        className={
          state?.status === "error"
            ? "min-h-5 text-sm text-destructive"
            : "min-h-5 text-sm"
        }
      >
        {state?.message}
      </p>
    </form>
  );
}
