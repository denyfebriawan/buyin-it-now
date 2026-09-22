import Link from "next/link";
import { notFound } from "next/navigation";

import { cancelOrderAction } from "@/app/actions/admin-orders";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getAdminOrder } from "@/lib/admin-orders";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatDateTime, formatOrderStatus, formatPrice } from "@/lib/format";
import { parseOrderId } from "@/lib/validation/orders";

export function generateMetadata() {
  return adminMetadata("Order detail");
}

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();

  const { id: rawId } = await params;
  const orderId = parseOrderId(rawId);
  if (orderId === null) notFound();

  // Unlike the customer's own order page, this is not limited to one user.
  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  return (
    <div>
      <Link
        href="/admin/orders"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Order #{order.id}
        </h1>
        <Badge variant="outline">{formatOrderStatus(order.status)}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {formatDateTime(order.createdAt)}
      </p>
      <p className="mt-1 text-sm">
        {order.user.name} ·{" "}
        <span className="text-muted-foreground">{order.user.email}</span>
      </p>

      <ul className="mt-6 max-w-2xl divide-y border-y">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/products/${item.product.id}`}
                className="font-medium hover:underline"
              >
                {item.product.name}
              </Link>
              {/* The price recorded when the order was placed, not today's. */}
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

      <div className="mt-4 flex max-w-2xl items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(order.totalCents)}</span>
      </div>

      {order.status === "PAID" && (
        <section className="mt-10" aria-labelledby="cancel-heading">
          <h2 id="cancel-heading" className="mb-1 text-lg font-semibold">
            Cancel order
          </h2>
          <p className="mb-4 max-w-xl text-sm text-muted-foreground">
            Returns every item&apos;s quantity to stock. There is no real
            payment to refund in this demo. A cancelled order cannot be
            reopened.
          </p>
          <form action={cancelOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <SubmitButton variant="destructive">Cancel order</SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
