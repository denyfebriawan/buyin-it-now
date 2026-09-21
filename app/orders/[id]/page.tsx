import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { parseOrderId } from "@/lib/validation/orders";

export const metadata: Metadata = { title: "Your order" };

const STATUS_LABEL = {
  PENDING: "Pending",
  PAID: "Paid (simulated)",
  CANCELLED: "Cancelled",
} as const;

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const orderId = parseOrderId(id);
  if (orderId === null) notFound();

  // getOrder() checks the login, and only returns the order if it belongs to
  // the current user. Someone else's order looks exactly like a missing one.
  const order = await getOrder(orderId);
  if (!order) notFound();

  const { placed } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {placed === "1" && (
        <p
          role="status"
          className="mb-6 rounded-lg border p-3 text-sm font-medium"
        >
          Thank you! Your order has been placed.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Order #{order.id}
        </h1>
        <Badge variant="outline">{STATUS_LABEL[order.status]}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {formatDateTime(order.createdAt)}
      </p>

      <ul className="mt-6 divide-y border-y">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-3">
            <Link
              href={`/products/${item.product.id}`}
              className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={item.product.imageUrl}
                alt={item.product.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.product.id}`}
                className="font-medium hover:underline"
              >
                {item.product.name}
              </Link>
              {/* The price recorded when the order was placed. */}
              <p className="text-sm text-muted-foreground">
                {item.quantity} × {formatPrice(item.unitPriceCents)}
              </p>
            </div>
            <p className="font-medium tabular-nums">
              {formatPrice(item.quantity * item.unitPriceCents)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(order.totalCents)}</span>
      </div>

      <Link
        href="/"
        className={buttonVariants({ variant: "outline", className: "mt-8" })}
      >
        Continue shopping
      </Link>
    </div>
  );
}
