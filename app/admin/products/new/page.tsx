import Link from "next/link";

import { createProductAction } from "@/app/actions/admin-products";
import { ProductForm } from "@/components/product-form";
import { buttonVariants } from "@/components/ui/button";
import { adminMetadata, requireAdmin } from "@/lib/auth";

export function generateMetadata() {
  return adminMetadata("New product");
}

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div>
      <Link
        href="/admin/products"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        All products
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        New product
      </h1>

      <div className="mt-6">
        <ProductForm
          action={createProductAction}
          initial={{ name: "", description: "", price: "", imageUrl: "" }}
          submitLabel="Create product"
        />
      </div>
    </div>
  );
}
