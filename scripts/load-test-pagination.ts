import "dotenv/config";

import { Client } from "pg";

// Proves that order history stays fast at depth, by comparing the "bookmark"
// (keyset) pagination getOrders() actually uses against the "skip N rows"
// (OFFSET) style most tutorials reach for first. It needs only a database —
// unlike scripts/load-test-checkout.ts, the app does not need to be running.
//
//   npm run load-test:pagination
//
// It loads 220,000 throwaway orders (spread over 2,000 users, plus one with
// 20,000 orders of their own, to have someone with a genuinely deep history
// to page through), measures real query times with EXPLAIN ANALYZE, then
// deletes everything it added.

const DOMAIN = "pagination-load-test.invalid";

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const cleanup = async () => {
    await db.query(
      `delete from orders where user_id in (select id from users where email like '%@${DOMAIN}')`,
    );
    await db.query(`delete from users where email like '%@${DOMAIN}'`);
  };
  await cleanup();

  console.log("Loading 2,000 users, 200,000 orders spread over them, plus one heavy user with 20,000...");
  const loadStart = Date.now();
  await db.query(
    `insert into users (name, email, password_hash)
     select 'Load ' || g, 'load-' || g || '@${DOMAIN}', 'x' from generate_series(1, 2000) g`,
  );
  await db.query(`insert into users (name, email, password_hash) values ('Heavy', 'load-heavy@${DOMAIN}', 'x')`);
  // Orders are inserted round-robin over every user, so each user's ids are
  // spread across the whole table rather than sitting in one contiguous
  // block — a fairer stand-in for a table that has been growing for years.
  await db.query(`
    insert into orders (user_id, status, total_cents)
    select u.id, 'PAID', 1000
    from generate_series(1, 100) round
    cross join (
      select id from users where email like 'load-%@${DOMAIN}' and email <> 'load-heavy@${DOMAIN}'
    ) u
  `);
  await db.query(`
    insert into orders (user_id, status, total_cents)
    select (select id from users where email = 'load-heavy@${DOMAIN}'), 'PAID', 1000
    from generate_series(1, 20000)
  `);
  await db.query("analyze orders");
  const totalOrders = (await db.query("select count(*)::int n from orders")).rows[0].n;
  console.log(`Loaded in ${((Date.now() - loadStart) / 1000).toFixed(1)} s. Orders in the table now: ${totalOrders}.\n`);

  const heavyId = (await db.query(`select id from users where email = 'load-heavy@${DOMAIN}'`)).rows[0].id;
  const normalId = (await db.query(`select id from users where email = 'load-77@${DOMAIN}'`)).rows[0].id;
  const heavyOrderIds = (
    await db.query("select id from orders where user_id = $1 order by id desc", [heavyId])
  ).rows.map((r) => r.id);
  const normalOrderIds = (
    await db.query("select id from orders where user_id = $1 order by id desc", [normalId])
  ).rows.map((r) => r.id);

  async function explain(label: string, sql: string, params: unknown[]): Promise<number> {
    const rows = (await db.query(`explain (analyze, buffers, format text) ${sql}`, params)).rows.map(
      (r) => r["QUERY PLAN"] as string,
    );
    const plan = rows.join("\n");
    const timeMs = Number(/Execution Time: ([\d.]+) ms/.exec(plan)?.[1]);
    const scans = [
      ...new Set(plan.match(/(Index Scan|Index Only Scan|Bitmap Index Scan|Seq Scan)[^\n(]*/g)?.map((s) => s.trim())),
    ].join("; ");
    const buffers = /Buffers: shared hit=(\d+)(?: read=(\d+))?/.exec(plan);
    const pagesTouched = buffers ? Number(buffers[1]) + Number(buffers[2] || 0) : undefined;
    console.log(
      `  ${label.padEnd(58)} ${timeMs.toFixed(3).padStart(8)} ms   ${scans}` +
        (pagesTouched !== undefined ? `   (pages touched: ${pagesTouched})` : ""),
    );
    return timeMs;
  }

  // Exactly what getOrders() in lib/orders.ts runs, id-descending with a
  // "before this id" bookmark, LIMIT one more than a page.
  const bookmarkQuery =
    "select id, status, total_cents, created_at from orders where user_id = $1 and id < $2 order by id desc limit 11";
  const firstPageQuery =
    "select id, status, total_cents, created_at from orders where user_id = $1 order by id desc limit 11";

  console.log("The bookmark (keyset) query getOrders() actually runs:");
  const times: number[] = [];
  times.push(await explain("normal user (100 orders), first page", firstPageQuery, [normalId]));
  times.push(await explain("normal user, a page in the middle", bookmarkQuery, [normalId, normalOrderIds[50]]));
  times.push(await explain("HEAVY user (20,000 orders), first page", firstPageQuery, [heavyId]));
  times.push(
    await explain("HEAVY user, a page ~10,000 deep", bookmarkQuery, [heavyId, heavyOrderIds[10_000]]),
  );
  times.push(
    await explain("HEAVY user, the very last page (oldest orders)", bookmarkQuery, [
      heavyId,
      heavyOrderIds[19_990],
    ]),
  );

  console.log("\nFor comparison, page-number ('skip N rows') style at the same depth:");
  const offsetTime = await explain(
    "HEAVY user, OFFSET 10,000 LIMIT 10",
    "select id, status, total_cents, created_at from orders where user_id = $1 order by id desc offset 10000 limit 10",
    [heavyId],
  );

  console.log("\nIndexes on orders:");
  for (const row of (await db.query("select indexdef from pg_indexes where tablename = 'orders' order by indexname"))
    .rows) {
    console.log(`  ${row.indexdef}`);
  }

  const worstBookmark = Math.max(...times);
  console.log(
    `\nSlowest bookmark query (any depth, either user): ${worstBookmark.toFixed(3)} ms.` +
      ` The OFFSET version at the same 10,000-row depth: ${offsetTime.toFixed(3)} ms` +
      ` (${(offsetTime / worstBookmark).toFixed(0)}x slower, and OFFSET only gets worse the deeper the page goes,` +
      ` where the bookmark query's cost barely moves — see the (userId, id) index above).`,
  );

  await cleanup();
  const left = (await db.query(`select count(*)::int n from users where email like '%@${DOMAIN}'`)).rows[0].n;
  console.log(`\nTest data removed: ${left === 0}`);
  await db.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
