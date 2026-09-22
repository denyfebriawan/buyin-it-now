import "dotenv/config";

import { SignJWT } from "jose";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

// Proves the claim the rest of this app is built around: many buyers hitting
// checkout for the same limited stock at the same instant never oversells,
// and nobody loses a sale that was really available. Run it against a real,
// running server (production mode, not `next dev`, which is slower and not
// representative):
//
//   npm run build && npm start
//   npm run load-test -- [baseUrl] [buyers] [stock] [readRequests]
//
// Defaults: http://localhost:3000, 120 buyers, 50 units of stock, 300 read
// requests. With 120 buyers and 50 units, 70 buyers are EXPECTED to lose —
// that is the point: the number that succeeds should be exactly the stock,
// never more, and (this being first-come-first-served, not a lottery) never
// fewer either.

const BASE = process.argv[2] ?? "http://localhost:3000";
const BUYERS = Number(process.argv[3] ?? 120);
const STOCK = Number(process.argv[4] ?? 50);
const READ_REQUESTS = Number(process.argv[5] ?? 300);

const DOMAIN = "load-test.invalid";

// Mints a session cookie the same way lib/session.ts's own (unexported)
// encrypt() does: same algorithm, payload shape and expiry, so the app
// accepts it exactly as it would a cookie from a real login. Doing this
// instead of a real signup + login for every buyer means the numbers below
// measure checkout under load, not argon2's hashing cost repeated 120 times.
async function sessionCookieFor(userId: number): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set. See .env.example.");
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
  return `session=${token}`;
}

// Pulls a Server Action's hidden fields out of a rendered page, the same way
// a browser's form submission would carry them. Next dispatches a Server
// Action by an opaque id posted alongside the form, so a request built
// without one is rejected — there is no way around fetching the real page
// first.
function hiddenFieldsOf(html: string, formMarker: string): [string, string][] {
  const start = html.indexOf(formMarker);
  const formHtml = html.slice(html.lastIndexOf("<form", start), html.indexOf("</form>", start));
  return [...formHtml.matchAll(/<input[^>]*type="hidden"[^>]*>/g)].map((m) => {
    const name = /name="([^"]*)"/.exec(m[0])?.[1] ?? "";
    const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    return [name, value.replace(/&quot;/g, '"').replace(/&amp;/g, "&")];
  });
}

function percentile(sortedMs: number[], p: number): number {
  const index = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[index];
}

async function main() {
  console.log(`Target: ${BASE}`);
  console.log(`${BUYERS} buyers, ${STOCK} units of stock, ${READ_REQUESTS} read requests.\n`);

  // ---------------------------------------------------------------- setup
  // Nothing in this section is timed: only the race itself, below, counts.
  console.log("Setting up (not timed)...");
  await cleanup();

  const passwordHash = await hashPassword("not a real password, only used to sign in as these accounts");
  const product = await prisma.product.create({
    data: {
      name: `Load test ${Date.now()}`,
      description: "Created by scripts/load-test-checkout.ts and removed when it finishes.",
      priceCents: 500,
      imageUrl: "https://picsum.photos/seed/load-test/600/600",
      stock: STOCK,
    },
  });

  const buyers = await Promise.all(
    Array.from({ length: BUYERS }, (_, i) =>
      prisma.user.create({
        data: { name: `Load ${i}`, email: `load-${i}-${Date.now()}@${DOMAIN}`, passwordHash },
        select: { id: true },
      }),
    ),
  );

  // Each buyer: sign in (a minted cookie, not a real login), add one unit to
  // the cart, then load /checkout to capture that buyer's own expected total.
  const checkouts = await Promise.all(
    buyers.map(async (buyer) => {
      const cookie = await sessionCookieFor(buyer.id);
      const productPage = await fetch(`${BASE}/products/${product.id}`, { headers: { cookie } });
      const addToCartFields = hiddenFieldsOf(await productPage.text(), 'name="quantity"');
      const addToCartBody = new FormData();
      for (const [k, v] of addToCartFields) addToCartBody.append(k, v);
      addToCartBody.set("quantity", "1");
      await fetch(`${BASE}/products/${product.id}`, {
        method: "POST",
        body: addToCartBody,
        headers: { cookie },
        redirect: "manual",
      });

      const checkoutPage = await fetch(`${BASE}/checkout`, { headers: { cookie } });
      const placeOrderFields = hiddenFieldsOf(await checkoutPage.text(), "Place order");
      const body = new FormData();
      for (const [k, v] of placeOrderFields) body.append(k, v);
      return { cookie, body };
    }),
  );
  console.log(`${buyers.length} buyers ready, each with 1 unit already in their cart.\n`);

  // ---------------------------------------------------------------- the race
  console.log("Racing: every buyer's checkout fires at the same instant...");
  const raceStart = performance.now();
  const results = await Promise.all(
    checkouts.map(async ({ cookie, body }) => {
      const start = performance.now();
      const res = await fetch(`${BASE}/checkout`, {
        method: "POST",
        body,
        headers: { cookie },
        redirect: "manual",
      });
      const durationMs = performance.now() - start;
      const won = res.status >= 300 && res.status < 400 && (res.headers.get("location") ?? "").includes("/orders/");
      return { durationMs, status: res.status, won };
    }),
  );
  const raceWallClockMs = performance.now() - raceStart;

  // ---------------------------------------------------------------- verify
  const won = results.filter((r) => r.won).length;
  const finalProduct = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: { stock: true },
  });
  const paidOrders = await prisma.order.count({
    where: { status: "PAID", items: { some: { productId: product.id } } },
  });
  const unitsSold = STOCK - finalProduct.stock;
  const expectedWinners = Math.min(BUYERS, STOCK);

  console.log("\n--- Checkout race ---");
  console.log(`Buyers:              ${BUYERS}`);
  console.log(`Stock:               ${STOCK}`);
  console.log(`Won (redirected to their order): ${won}`);
  console.log(`Lost (insufficient stock):       ${BUYERS - won}`);
  console.log(`PAID orders for this product:    ${paidOrders}`);
  console.log(`Units sold (by stock delta):      ${unitsSold}`);
  console.log(`Wall clock for the whole race:    ${raceWallClockMs.toFixed(0)} ms`);
  console.log(`Throughput:                       ${(BUYERS / (raceWallClockMs / 1000)).toFixed(1)} requests/s`);
  const sorted = results.map((r) => r.durationMs).sort((a, b) => a - b);
  console.log(`Checkout latency — p50: ${percentile(sorted, 50).toFixed(0)} ms, p90: ${percentile(sorted, 90).toFixed(0)} ms, p99: ${percentile(sorted, 99).toFixed(0)} ms, max: ${sorted.at(-1)?.toFixed(0)} ms`);

  const correct = won === expectedWinners && paidOrders === expectedWinners && unitsSold === expectedWinners;
  console.log(
    correct
      ? `\nCorrect: exactly ${expectedWinners} buyers won, exactly ${expectedWinners} units left the stock, and every PAID order agrees. Nobody was oversold, and no available unit went unsold.`
      : `\nMISMATCH: expected exactly ${expectedWinners} winners (min(buyers, stock)), but won=${won}, paidOrders=${paidOrders}, unitsSold=${unitsSold}. Investigate before trusting this run's numbers.`,
  );

  // ------------------------------------------------------ read throughput
  // A second, separate number: how the catalog (a plain read, no locking)
  // handles many requests at once — the broader "many concurrent requests"
  // case, not just the narrow stock-racing one above.
  console.log(`\n--- Reading the catalog: ${READ_REQUESTS} concurrent requests ---`);
  const readStart = performance.now();
  const readDurations = await Promise.all(
    Array.from({ length: READ_REQUESTS }, async () => {
      const start = performance.now();
      await fetch(BASE + "/");
      return performance.now() - start;
    }),
  );
  const readWallClockMs = performance.now() - readStart;
  const sortedReads = readDurations.sort((a, b) => a - b);
  console.log(`Wall clock: ${readWallClockMs.toFixed(0)} ms`);
  console.log(`Throughput: ${(READ_REQUESTS / (readWallClockMs / 1000)).toFixed(1)} requests/s`);
  console.log(`Latency — p50: ${percentile(sortedReads, 50).toFixed(0)} ms, p90: ${percentile(sortedReads, 90).toFixed(0)} ms, p99: ${percentile(sortedReads, 99).toFixed(0)} ms, max: ${sortedReads.at(-1)?.toFixed(0)} ms`);

  console.log(
    "\nThese req/s figures describe this one machine on this one run, not a" +
      " production server — rerun it to get your own. What matters, and does" +
      " not depend on the hardware, is the correctness result above: it holds" +
      " because the stock check and the stock decrement are one atomic SQL" +
      " statement (see lib/orders.ts), not because of anything about scale.",
  );

  await cleanup();
}

async function cleanup() {
  await prisma.orderItem.deleteMany({
    where: { order: { user: { email: { endsWith: `@${DOMAIN}` } } } },
  });
  await prisma.order.deleteMany({ where: { user: { email: { endsWith: `@${DOMAIN}` } } } });
  await prisma.cartItem.deleteMany({ where: { user: { email: { endsWith: `@${DOMAIN}` } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  await prisma.product.deleteMany({ where: { name: { startsWith: "Load test " } } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
