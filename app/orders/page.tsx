import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime, formatOrderStatus, formatPrice } from "@/lib/format";
import { getOrders } from "@/lib/orders";
import { parseOrderId } from "@/lib/validation/orders";

export const metadata: Metadata = { title: "Your orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const { before } = await searchParams;
  // ?before=41 means "orders older than #41". Anything that is not a plain
  // number (or is given twice) is ignored and shows the newest orders, so a
  // strange link can never cause an error.
  const cursor = typeof before === "string" ? parseOrderId(before) : null;

  // getOrders() checks the login and only ever returns the user's own orders.
  const { orders, nextBefore } = await getOrders(cursor ?? undefined);

  if (orders.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {cursor === null ? "No orders yet" : "No older orders"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {cursor === null
            ? "When you place an order, it will show up here."
            : "You have reached the end of your order history."}
        </p>
        <Link
          href={cursor === null ? "/" : "/orders"}
          className={buttonVariants({ className: "mt-6" })}
        >
          {cursor === null ? "Browse products" : "Back to newest orders"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>

      <ul className="mt-6 divide-y border-y">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="flex items-center justify-between gap-4 py-4 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="font-medium">Order #{order.id}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(order.createdAt)} · {order.itemCount}{" "}
                  {order.itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant="outline">{formatOrderStatus(order.status)}</Badge>
                <span className="font-medium tabular-nums">
                  {formatPrice(order.totalCents)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        {cursor !== null ? (
          <Link
            href="/orders"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Newest orders
          </Link>
        ) : (
          <span />
        )}
        {nextBefore !== null && (
          <Link
            href={`/orders?before=${nextBefore}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Older orders
          </Link>
        )}
      </div>
    </div>
  );
}
