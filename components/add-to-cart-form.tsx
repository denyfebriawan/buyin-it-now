"use client";

import { useActionState } from "react";

import { addToCartAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The product page (a Server Component) renders this small client piece and
// passes it plain values. maxQuantity comes from the server so this file does
// not need to import the validation code.
export function AddToCartForm({
  productId,
  maxQuantity,
}: {
  productId: number;
  maxQuantity: number;
}) {
  const [state, formAction, pending] = useActionState(
    addToCartAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />

      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity}
            defaultValue={1}
            required
            className="w-24"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Adding..." : "Add to cart"}
        </Button>
      </div>

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
