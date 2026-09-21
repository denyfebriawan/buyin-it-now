import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveProductAction,
  restoreProductAction,
  updateProductAction,
} from "@/app/actions/admin-products";
import { ProductForm } from "@/components/product-form";
import { StockAdjustForm } from "@/components/stock-adjust-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getAdminProduct } from "@/lib/admin-products";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatPriceInput } from "@/lib/format";
import { parseProductId } from "@/lib/products";

export function generateMetadata() {
  return adminMetadata("Edit product");
}

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  await requireAdmin();

  const { id: rawId } = await params;
  const id = parseProductId(rawId);
  if (id === null) notFound();

  // Unlike the shop, this finds archived products too.
  const product = await getAdminProduct(id);
  if (!product) notFound();

  const archived = product.archivedAt !== null;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href={archived ? "/admin/products?status=archived" : "/admin/products"}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          All products
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {archived && <Badge variant="secondary">Archived</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Product #{product.id}
          {archived
            ? ". It is hidden from the shop."
            : (
              <>
                {" · "}
                <Link
                  href={`/products/${product.id}`}
                  className="underline underline-offset-4"
                >
                  View in the shop
                </Link>
              </>
            )}
        </p>
      </div>

      <section aria-labelledby="details-heading">
        <h2 id="details-heading" className="mb-4 text-lg font-semibold">
          Details
        </h2>
        <ProductForm
          action={updateProductAction}
          productId={product.id}
          initial={{
            name: product.name,
            description: product.description,
            price: formatPriceInput(product.priceCents),
            imageUrl: product.imageUrl,
          }}
          submitLabel="Save changes"
        />
      </section>

      <section aria-labelledby="stock-heading">
        <h2 id="stock-heading" className="mb-1 text-lg font-semibold">
          Stock
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter how many to add (20) or remove (-5). Sales that happen while you
          type are never lost.
        </p>
        <StockAdjustForm productId={product.id} stock={product.stock} />
      </section>

      <section aria-labelledby="visibility-heading">
        <h2 id="visibility-heading" className="mb-1 text-lg font-semibold">
          {archived ? "Restore" : "Archive"}
        </h2>
        {archived ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Put this product back on sale with the stock it has now.
            </p>
            <form action={restoreProductAction}>
              <input type="hidden" name="productId" value={product.id} />
              <SubmitButton variant="outline">Restore product</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="mb-4 max-w-xl text-sm text-muted-foreground">
              Hides this product from the shop and removes it from every
              customer&apos;s cart. Past orders keep showing it. You can restore
              it at any time.
            </p>
            <form action={archiveProductAction}>
              <input type="hidden" name="productId" value={product.id} />
              <SubmitButton variant="destructive">Archive product</SubmitButton>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
