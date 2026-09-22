"use client";

import { useActionState } from "react";

import { adjustStockAction } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Changes the stock by an amount: +20 after a delivery, -3 for damaged goods.
// It sends the amount, not a new total, so sales that happen while the admin is
// typing are never overwritten.
export function StockAdjustForm({
  productId,
  stock,
}: {
  productId: number;
  stock: number;
}) {
  const [state, formAction, pending] = useActionState(
    adjustStockAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />

      <p className="text-sm">
        In stock now: <span className="font-medium tabular-nums">{stock}</span>
      </p>

      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="delta">Change by</Label>
          {/* The key changes after every result, which empties the box. */}
          <Input
            key={state?.message ?? "initial"}
            id="delta"
            name="delta"
            type="number"
            inputMode="numeric"
            step={1}
            required
            placeholder="+20 or -5"
            className="w-32"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Updating..." : "Update stock"}
        </Button>
      </div>

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
