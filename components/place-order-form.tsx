"use client";

import Link from "next/link";
import { useActionState } from "react";

import { placeOrderAction } from "@/app/actions/orders";
import { SubmitButton } from "@/components/submit-button";

// The form carries only the total the buyer saw (so the server can refuse the
// order if it changed) and a button. Nothing here can change what is bought or
// what it costs: that is always worked out on the server.
export function PlaceOrderForm({
  expectedTotalCents,
  disabled,
}: {
  expectedTotalCents: number;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(placeOrderAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="hidden"
        name="expectedTotalCents"
        value={expectedTotalCents}
      />

      {state?.message && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          <p>{state.message}</p>
          {state.shortItems && (
            <ul className="mt-2 list-disc pl-5">
              {state.shortItems.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  {item.name}: you asked for {item.requested},{" "}
                  {item.available === 0
                    ? "none are left"
                    : `only ${item.available} left`}
                  .
                </li>
              ))}
            </ul>
          )}
          <Link href="/cart" className="mt-2 inline-block underline">
            Review your cart
          </Link>
        </div>
      )}

      <SubmitButton size="lg" disabled={disabled}>
        Place order
      </SubmitButton>
    </form>
  );
}
