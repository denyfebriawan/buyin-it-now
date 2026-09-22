import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AdminOrderStatusFilter,
  getAdminOrders,
} from "@/lib/admin-orders";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatDateTime, formatOrderStatus, formatPrice } from "@/lib/format";
import { parseOrderId } from "@/lib/validation/orders";
import { cn } from "@/lib/utils";

export function generateMetadata() {
  return adminMetadata("Orders");
}

const SEARCH_MAX_LENGTH = 254; // as long as the email addresses it searches

const STATUS_TABS: { value: AdminOrderStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

// Builds a link that keeps the current filter and search. Only values that
// differ from the default end up in the address.
function listHref(params: {
  status: AdminOrderStatusFilter;
  search?: string;
  before?: number;
}) {
  const query = new URLSearchParams();
  if (params.status !== "all") query.set("status", params.status);
  if (params.search) query.set("q", params.search);
  if (params.before) query.set("before", String(params.before));
  const text = query.toString();
  return text ? `/admin/orders?${text}` : "/admin/orders";
}

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  await requireAdmin();

  const { status: rawStatus, q, before } = await searchParams;
  // The address is user input. Anything unexpected (a value given twice, a
  // status that is not one of the four, a bookmark that is not a number) falls
  // back to the default instead of causing an error.
  const status: AdminOrderStatusFilter = STATUS_TABS.some(
    (tab) => tab.value === rawStatus,
  )
    ? (rawStatus as AdminOrderStatusFilter)
    : "all";
  const search =
    typeof q === "string" ? q.trim().slice(0, SEARCH_MAX_LENGTH) : "";
  const cursor = typeof before === "string" ? parseOrderId(before) : null;

  const { orders, nextBefore } = await getAdminOrders({
    status,
    search: search || undefined,
    before: cursor ?? undefined,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Order status" className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={listHref({ status: tab.value, search })}
              aria-current={status === tab.value ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted",
                status === tab.value && "bg-muted",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* A plain GET form: submitting it just opens the same page with ?q=. */}
        <form method="get" action="/admin/orders" className="flex gap-2">
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          <Input
            name="q"
            type="search"
            placeholder="Search by customer or order #"
            aria-label="Search orders by customer name, email, or order number"
            maxLength={SEARCH_MAX_LENGTH}
            defaultValue={search}
            className="w-full sm:w-72"
          />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Search
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          {search
            ? `No orders match "${search}".`
            : cursor
              ? "No older orders."
              : "No orders yet."}
        </p>
      ) : (
        <ul className="mt-6 divide-y border-y">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    Order #{order.id} · {order.user.name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {order.user.email} · {formatDateTime(order.createdAt)} ·{" "}
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="outline">
                    {formatOrderStatus(order.status)}
                  </Badge>
                  <span className="font-medium tabular-nums">
                    {formatPrice(order.totalCents)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {nextBefore !== null && (
        <div className="mt-6 flex justify-center">
          <Link
            href={listHref({ status, search, before: nextBefore })}
            className={buttonVariants({ variant: "outline" })}
          >
            Older orders
          </Link>
        </div>
      )}
      {cursor !== null && (
        <div className="mt-3 flex justify-center">
          <Link
            href={listHref({ status, search })}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Back to newest
          </Link>
        </div>
      )}
    </div>
  );
}
