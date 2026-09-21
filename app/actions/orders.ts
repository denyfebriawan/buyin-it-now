"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { formatPrice } from "@/lib/format";
import { placeOrder } from "@/lib/orders";
import { placeOrderSchema } from "@/lib/validation/orders";

export type PlaceOrderState =
  | {
      message: string;
      // Set when some items did not have enough stock.
      shortItems?: { name: string; requested: number; available: number }[];
    }
  | undefined;

// The form sends only the total the buyer saw. What is bought and at what price
// always comes from the server-side cart and the database. The login check is
// inside placeOrder(), which redirects anonymous visitors.
export async function placeOrderAction(
  _previousState: PlaceOrderState,
  formData: FormData,
): Promise<PlaceOrderState> {
  const parsed = placeOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: "Something went wrong. Please reload the page and try again." };
  }

  const result = await placeOrder(parsed.data.expectedTotalCents);

  // redirect() works by throwing, so it stays outside any try/catch.
  if (result.ok) redirect(`/orders/${result.orderId}?placed=1`);

  // Every failure left the cart untouched (the transaction rolled back).
  // refresh() re-renders the checkout page, so its summary, warnings and the
  // total in the hidden field match what is true now.
  refresh();

  if (result.reason === "empty-cart") {
    return { message: "Your cart is empty." };
  }
  if (result.reason === "price-changed") {
    return {
      message: `The total changed while you were checking out. It is now ${formatPrice(result.totalCents)}. Please review it and place the order again.`,
    };
  }
  return {
    message:
      "Some items are no longer available in the quantity you chose. Nothing was charged, and your cart is unchanged.",
    shortItems: result.items.map(({ name, requested, available }) => ({
      name,
      requested,
      available,
    })),
  };
}
