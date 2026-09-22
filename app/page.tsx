import Link from "next/link";
import { connection } from "next/server";

import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProducts,
  parseProductId,
  type ProductSort,
} from "@/lib/products";
import { cn } from "@/lib/utils";
import { MAX_PRICE_CENTS } from "@/lib/validation/product";

const SEARCH_MAX_LENGTH = 80;

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

// Builds a link that keeps the current sort and search. Only values that
// differ from the default end up in the address, and a page's own bookmark
// (before / beforePrice) is only ever carried into the NEXT page's link, not
// into a sort or search link — changing either one starts over at page one.
function catalogHref(params: {
  sort: ProductSort;
  search?: string;
  before?: number;
  beforePriceCents?: number;
}) {
  const query = new URLSearchParams();
  if (params.sort !== "newest") query.set("sort", params.sort);
  if (params.search) query.set("q", params.search);
  if (params.before !== undefined) query.set("before", String(params.before));
  if (params.beforePriceCents !== undefined) {
    query.set("beforePrice", String(params.beforePriceCents));
  }
  const text = query.toString();
  return text ? `/?${text}` : "/";
}

export default async function Home({ searchParams }: PageProps<"/">) {
  // Wait for a real request, so the database is read on every visit instead of
  // once at build time.
  await connection();

  const { q, sort: rawSort, before, beforePrice } = await searchParams;
  // The address is user input. Anything unexpected (a value given twice, a
  // sort that isn't one of the three, a bookmark that isn't a number) falls
  // back to the default instead of causing an error.
  const sort: ProductSort = SORTS.some((s) => s.value === rawSort)
    ? (rawSort as ProductSort)
    : "newest";
  const search =
    typeof q === "string" ? q.trim().slice(0, SEARCH_MAX_LENGTH) : "";
  const cursorId = typeof before === "string" ? parseProductId(before) : null;
  const cursorPriceCents =
    typeof beforePrice === "string" &&
    /^\d+$/.test(beforePrice) &&
    Number(beforePrice) <= MAX_PRICE_CENTS
      ? Number(beforePrice)
      : null;
  // A price-sorted bookmark needs BOTH numbers to mean anything (see
  // lib/products.ts); a newest bookmark only ever needs the id. Anything less
  // than that just shows the first page again, rather than erroring.
  const hasCursor =
    sort === "newest" ? cursorId !== null : cursorId !== null && cursorPriceCents !== null;

  const { products, nextCursor } = await getProducts({
    search: search || undefined,
    sort,
    before: hasCursor && cursorId !== null ? cursorId : undefined,
    beforePriceCents: hasCursor && cursorPriceCents !== null ? cursorPriceCents : undefined,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">All products</h1>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Sort" className="flex flex-wrap gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={catalogHref({ sort: s.value, search })}
              aria-current={sort === s.value ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted",
                sort === s.value && "bg-muted",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        {/* A plain GET form: submitting it just opens the same page with ?q=.
            Searching starts again from the first page. */}
        <form method="get" action="/" className="flex gap-2">
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
          <Input
            name="q"
            type="search"
            placeholder="Search products"
            aria-label="Search products by name"
            maxLength={SEARCH_MAX_LENGTH}
            defaultValue={search}
            className="w-full sm:w-64"
          />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Search
          </button>
        </form>
      </div>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          {search
            ? `No products match "${search}".`
            : hasCursor
              ? "No more products."
              : "No products are available yet. Please check back soon."}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <div className="mt-8 flex justify-center">
          <Link
            href={catalogHref({
              sort,
              search,
              before: nextCursor.before,
              beforePriceCents: nextCursor.beforePriceCents,
            })}
            className={buttonVariants({ variant: "outline" })}
          >
            Load more products
          </Link>
        </div>
      )}
      {hasCursor && (
        <div className="mt-3 flex justify-center">
          <Link
            href={catalogHref({ sort, search })}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Back to the first page
          </Link>
        </div>
      )}
    </div>
  );
}
