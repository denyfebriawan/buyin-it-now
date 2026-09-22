# Buyin It Now

A full-stack e-commerce portfolio project: a small shop where customers browse, buy and
track orders, and admins manage products, orders and accounts. It's built to survive many
people trying to buy the same limited thing at the same instant — that's the problem this
project actually exists to demonstrate. Payment is simulated; nothing here charges a real
card.

## Features

**Shop**
- Product catalog and detail pages, with live stock shown per item
- Auth (sign up, log in, log out), argon2id-hashed passwords, JWT session cookies
- A cart that caps at the product's real stock, and survives being edited from two tabs
- Checkout, with an itemized order confirmation
- Order history, newest first, with "load more" pagination that stays fast at any depth

**Admin** (`/admin`, gated by role)
- **Overview** — revenue, order and product/customer counts, a 14-day sales chart, low
  stock, recent orders
- **Products** — create, edit, adjust stock, and archive/restore (a product that has ever
  been ordered can't be deleted, only hidden from the shop)
- **Orders** — search and filter every order, cancel a paid one (returns its stock)
- **Users** — search accounts, promote or demote admins, with an audit log of every change.
  An admin can't demote themselves, and the last admin can never be demoted, even if two
  admins try at the same instant (see below)

## Concurrency & scale

The interesting part of an e-commerce app isn't the happy path — it's what happens when a
hundred people click "buy" on the last unit of something at the same time. That's the
actual problem this project is built to solve, so it's solved at the database, not papered
over with a queue or a lock in application code:

- **Selling out never oversells.** Checking the stock and taking it happen in one atomic
  SQL statement (`UPDATE products SET stock = stock - qty WHERE stock >= qty`), not a
  read-then-write in JavaScript. Two buyers racing for the last unit can never both win.
- **First-come, first-served, honestly.** The price charged is the one recorded the instant
  stock is taken, and a double-click or a retried request can't create two orders — the
  cart is deleted as the first step of the same transaction.
- **The same pattern everywhere stock changes**: an admin's stock adjustment
  (`stock = stock + delta`), archiving a product, and cancelling an order (which returns
  its stock) are all single atomic statements, never "read the number, do math, write it
  back."
- **Demoting the last admin is a concurrency problem too.** Two admins demoting two
  different admins at the same instant, both leaving zero, is guarded by locking every
  admin row before counting — see `lib/admin-users.ts`.

### Proving it, not just claiming it

`scripts/load-test-checkout.ts` runs many buyers' checkouts for the same limited stock at
the exact same instant against a real running server, then checks the database: did the
number of winners equal the stock, exactly? A real run, on ordinary developer hardware
(no production infrastructure):

```
120 buyers, 50 units of stock, 300 read requests.

--- Checkout race ---
Won (redirected to their order): 50
Lost (insufficient stock):       70
PAID orders for this product:    50
Units sold (by stock delta):      50
Wall clock for the whole race:    642 ms
Throughput:                       186.8 requests/s
Checkout latency — p50: 578 ms, p90: 615 ms, p99: 627 ms, max: 627 ms

Correct: exactly 50 buyers won, exactly 50 units left the stock, and every PAID
order agrees. Nobody was oversold, and no available unit went unsold.

--- Reading the catalog: 300 concurrent requests ---
Throughput: 225.1 requests/s
Latency — p50: 1001 ms, p90: 1278 ms, p99: 1308 ms, max: 1308 ms
```

At 300 buyers racing for 100 units, the result is the same: exactly 100 winners, exactly
100 units sold, nothing over or under. The req/s figures are one laptop's numbers, not a
claim about production throughput — rerun it to get your own. What doesn't depend on the
hardware is the correctness result, because it comes from one atomic statement, not from
how fast anything runs.

`scripts/load-test-pagination.ts` proves the order history's "load more" stays fast
regardless of how much history there is, by loading 220,000 throwaway orders (one account
with 20,000 of its own) and comparing the keyset ("give me orders older than #41") query
this app actually runs against the more common "skip N rows" (`OFFSET`) style:

```
  HEAVY user (20,000 orders), first page                 0.027 ms   Index Scan Backward
  HEAVY user, a page ~10,000 deep                         0.024 ms   Index Scan Backward
  HEAVY user, the very last page (oldest orders)          0.018 ms   Index Scan Backward
  HEAVY user, OFFSET 10,000 LIMIT 10                       1.917 ms   Index Scan Backward

Slowest bookmark query (any depth, either user): 0.027 ms. The OFFSET version at
the same 10,000-row depth: 1.917 ms (71x slower, and OFFSET only gets worse the
deeper the page goes, where the bookmark query's cost barely moves).
```

Both scripts clean up everything they create, whether they pass or fail.

```bash
# needs a running server (a production build, not `next dev`):
npm run build && npm start
npm run load-test:checkout                       # defaults: 120 buyers, 50 stock, 300 reads
npm run load-test:checkout -- http://localhost:3000 300 100 500

# needs only the database, not a running server:
npm run load-test:pagination
```

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Database**: PostgreSQL, accessed through Prisma 7 (with raw SQL for anything
  concurrency-critical, atomic, or aggregate)
- **Auth**: argon2id password hashing, stateless JWT session cookies (`jose`)
- **Validation**: Zod, on every Server Action, never trusting the client
- **UI**: Tailwind CSS 4, shadcn/ui, Base UI
- **Charts**: hand-built inline SVG (no charting library), following a documented
  accessible-by-default palette and interaction method

## Getting started

```bash
cp .env.example .env
# fill in DATABASE_URL and a SESSION_SECRET (openssl rand -base64 32)

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To reach the admin area, make an
account an admin from the command line (there is no in-app way to become the first admin):

```bash
npm run db:make-admin -- you@example.com
```

## Project structure

Data access lives in `lib/*.ts` — one file per area (`orders.ts`, `cart.ts`,
`admin-products.ts`, ...), each function checking who's allowed to call it itself, never
relying only on a layout or a page to have already checked. Server Actions in
`app/actions/*.ts` are thin: validate with Zod, call the `lib` function, done. Routes in
`app/` are almost all Server Components; the handful of Client Components are the ones that
need interactivity (a form's pending state, the admin nav's current-page highlight, the
sales chart's hover).
