"use server";

import { refresh } from "next/cache";

import { cancelOrder } from "@/lib/admin-orders";
import { orderIdSchema } from "@/lib/validation/orders";

// Can be posted to directly, not only through the Cancel button, so the admin
// check inside cancelOrder() cannot be skipped. Like the product archive and
// restore actions, this ignores invalid input silently (the button only ever
// sends a real order id, so bad input means a forged request) and returns
// nothing: cancelOrder()'s result (already cancelled, no such order, ...)
// has nowhere to be shown. The Cancel button only exists while the order is
// PAID, and cancelling makes it not PAID, so the section holding any message
// would disappear in the very same render that produced it. The order's new
// status badge, and the button being gone, are the feedback.
export async function cancelOrderAction(formData: FormData): Promise<void> {
  const parsed = orderIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await cancelOrder(parsed.data.orderId);
  refresh();
}
