import Link from "next/link";

import { SalesChart } from "@/components/sales-chart";
import { StatTile } from "@/components/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview, SALES_CHART_DAYS } from "@/lib/admin-overview";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatDateTime, formatOrderStatus, formatPrice } from "@/lib/format";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";

export function generateMetadata() {
  return adminMetadata("Admin");
}

export default async function AdminOverviewPage() {
  // Checked here as well as in the layout: a page must never rely on a layout.
  const admin = await requireAdmin();
  const overview = await getAdminOverview();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as {admin.name} ({admin.email}).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenue" value={formatPrice(overview.revenueCents)} />
        <StatTile
          label="Orders"
          value={overview.orders.total.toLocaleString("en-US")}
          secondary={`${overview.orders.paid} paid · ${overview.orders.cancelled} cancelled`}
        />
        <StatTile
          label="Products"
          value={overview.products.active.toLocaleString("en-US")}
          secondary={`${overview.products.archived} archived`}
        />
        <StatTile
          label="Customers"
          value={overview.users.customers.toLocaleString("en-US")}
          secondary={`${overview.users.admins} admin${overview.users.admins === 1 ? "" : "s"}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue, last {SALES_CHART_DAYS} days</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={overview.salesChart} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="low-stock-heading">
          <div className="flex items-center justify-between">
            <h2 id="low-stock-heading" className="text-lg font-semibold">
              Low stock
            </h2>
            <Link
              href="/admin/products"
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              All products
            </Link>
          </div>
          {overview.lowStockProducts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No product has {LOW_STOCK_THRESHOLD} or fewer left in stock.
            </p>
          ) : (
            <ul className="mt-3 divide-y border-y">
              {overview.lowStockProducts.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/50"
                  >
                    <span className="truncate">{product.name}</span>
                    <Badge variant={product.stock === 0 ? "secondary" : "outline"}>
                      {product.stock === 0
                        ? "Out of stock"
                        : `${product.stock} left`}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-orders-heading">
          <div className="flex items-center justify-between">
            <h2 id="recent-orders-heading" className="text-lg font-semibold">
              Recent orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              All orders
            </Link>
          </div>
          {overview.recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No orders have been placed yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y border-y">
              {overview.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        #{order.id} · {order.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline">
                        {formatOrderStatus(order.status)}
                      </Badge>
                      <span className="text-sm font-medium tabular-nums">
                        {formatPrice(order.totalCents)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
