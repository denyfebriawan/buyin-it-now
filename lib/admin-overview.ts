import "server-only";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";

const LOW_STOCK_LIMIT = 8;
const RECENT_ORDERS_LIMIT = 8;
export const SALES_CHART_DAYS = 14;

// Everything the admin overview page shows. One function, one requireAdmin()
// call, because every piece here is read at once for a single page. The
// individual queries are independent of each other, so they run with
// Promise.all (concurrently) instead of one after another: the whole page
// waits for only the SLOWEST of them, not the sum of all of them.
export async function getAdminOverview() {
  await requireAdmin();

  const [
    revenue,
    orderCounts,
    [activeProductCount, archivedProductCount],
    userCounts,
    lowStockProducts,
    recentOrders,
    dailyRevenue,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { totalCents: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    // Not groupBy({ by: ["archivedAt"] }): archivedAt holds a different exact
    // timestamp for every archived product, so grouping by its raw value
    // would make a separate bucket per product instead of one "archived"
    // bucket. Grouping only works here for status and role below, because
    // those are enums with a handful of shared values.
    Promise.all([
      prisma.product.count({ where: { archivedAt: null } }),
      prisma.product.count({ where: { archivedAt: { not: null } } }),
    ]),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.product.findMany({
      where: { archivedAt: null, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: { stock: "asc" },
      take: LOW_STOCK_LIMIT,
      select: { id: true, name: true, stock: true },
    }),
    prisma.order.findMany({
      orderBy: { id: "desc" },
      take: RECENT_ORDERS_LIMIT,
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    // generate_series builds one row per day in the window; LEFT JOIN keeps
    // every day even when it sold nothing, and COALESCE turns that missing
    // match into 0. Without this, a day with no sales would be missing from
    // the result entirely, and the chart would draw a line that jumps
    // straight over it instead of touching zero.
    //
    // The day is returned as formatted TEXT (to_char), not a date/timestamp
    // value. A raw date value gets turned into a JS Date when it comes back,
    // and printing a Date as text (toISOString()) depends on the timezone of
    // whichever machine happens to run this code, which is exactly the kind
    // of bug that works while developing and breaks after deploying
    // somewhere with a different default timezone. Comparing and grouping
    // still happens in SQL on real date values; only the OUTPUT is text.
    prisma.$queryRaw<{ day: string; revenue_cents: bigint }[]>`
      SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(SUM(o.total_cents), 0)::bigint AS revenue_cents
      FROM generate_series(
        date_trunc('day', NOW()) - (${SALES_CHART_DAYS - 1}::int) * INTERVAL '1 day',
        date_trunc('day', NOW()),
        INTERVAL '1 day'
      ) AS d
      LEFT JOIN orders o
        ON date_trunc('day', o.created_at) = d AND o.status = 'PAID'
      GROUP BY d
      ORDER BY d
    `,
  ]);

  const ordersByStatus = Object.fromEntries(
    orderCounts.map((row) => [row.status, row._count]),
  );
  const usersByRole = Object.fromEntries(
    userCounts.map((row) => [row.role, row._count]),
  );

  // $queryRaw returns a bigint (a Postgres BIGINT, from SUM()) as a JS
  // BigInt, which JSON.stringify refuses to serialize. Revenue for 14 days
  // of a demo shop never gets remotely close to overflowing a plain number,
  // so this converts it back for the page to pass down as an ordinary prop.
  const salesChart = dailyRevenue.map((row) => ({
    date: row.day,
    revenueCents: Number(row.revenue_cents),
  }));

  return {
    revenueCents: revenue._sum.totalCents ?? 0,
    orders: {
      total: orderCounts.reduce((sum, row) => sum + row._count, 0),
      paid: ordersByStatus.PAID ?? 0,
      pending: ordersByStatus.PENDING ?? 0,
      cancelled: ordersByStatus.CANCELLED ?? 0,
    },
    products: {
      active: activeProductCount,
      archived: archivedProductCount,
    },
    users: {
      customers: usersByRole.CUSTOMER ?? 0,
      admins: usersByRole.ADMIN ?? 0,
    },
    lowStockProducts,
    recentOrders,
    salesChart,
  };
}
