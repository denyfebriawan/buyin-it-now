import Image from "next/image";
import Link from "next/link";

import { StockBadge } from "@/components/stock-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAdminProducts,
  type ProductStatusFilter,
} from "@/lib/admin-products";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { parseProductId } from "@/lib/products";
import { cn } from "@/lib/utils";

export function generateMetadata() {
  return adminMetadata("Products");
}

const SEARCH_MAX_LENGTH = 80;

// Builds a link that keeps the current filter and search. Only values that are
// set end up in the address.
function listHref(params: {
  status: ProductStatusFilter;
  search?: string;
  before?: number;
}) {
  const query = new URLSearchParams();
  if (params.status === "archived") query.set("status", "archived");
  if (params.search) query.set("q", params.search);
  if (params.before) query.set("before", String(params.before));
  const text = query.toString();
  return text ? `/admin/products?${text}` : "/admin/products";
}

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  await requireAdmin();

  const { status: rawStatus, q, before } = await searchParams;
  // The address is user input. Anything unexpected (a value given twice, a
  // strange status, a bookmark that is not a number) falls back to the default
  // instead of causing an error.
  const status: ProductStatusFilter =
    rawStatus === "archived" ? "archived" : "active";
  const search =
    typeof q === "string" ? q.trim().slice(0, SEARCH_MAX_LENGTH) : "";
  const cursor = typeof before === "string" ? parseProductId(before) : null;

  const { products, nextBefore } = await getAdminProducts({
    status,
    search: search || undefined,
    before: cursor ?? undefined,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Link href="/admin/products/new" className={buttonVariants()}>
          New product
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Product status" className="flex gap-1">
          {(["active", "archived"] as const).map((value) => (
            <Link
              key={value}
              href={listHref({ status: value, search })}
              aria-current={status === value ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted",
                status === value && "bg-muted",
              )}
            >
              {value === "active" ? "Active" : "Archived"}
            </Link>
          ))}
        </nav>

        {/* A plain GET form: submitting it just opens the same page with ?q=.
            Searching starts again from the newest products. */}
        <form method="get" action="/admin/products" className="flex gap-2">
          {status === "archived" && (
            <input type="hidden" name="status" value="archived" />
          )}
          <Input
            name="q"
            type="search"
            placeholder="Search by name"
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
            ? `No ${status} products match "${search}".`
            : cursor
              ? "No older products."
              : status === "archived"
                ? "No archived products."
                : "No products yet. Add the first one."}
        </p>
      ) : (
        <ul className="mt-6 divide-y border-y">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/products/${product.id}`}
                className="flex items-center gap-4 py-3 hover:bg-muted/50"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={product.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    #{product.id} · {formatPrice(product.priceCents)} ·{" "}
                    {product.stock.toLocaleString("en-US")} in stock
                  </p>
                </div>
                <StockBadge stock={product.stock} />
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
            Older products
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
