import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StockBadge } from "@/components/stock-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { getProductById, parseProductId } from "@/lib/products";
import { getStockStatus } from "@/lib/stock";

// Shared by the page and generateMetadata. A bad id and a missing product both
// come back as null.
async function loadProduct(rawId: string) {
  const id = parseProductId(rawId);
  if (id === null) return null;
  return getProductById(id);
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);

  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.description };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;
  const product = await loadProduct(id);

  if (!product) notFound();

  const soldOut = getStockStatus(product.stock) === "out";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft />
        All products
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            // The main photo is the first thing shoppers see, so fetch it first.
            fetchPriority="high"
            className={
              soldOut ? "object-cover opacity-60 grayscale" : "object-cover"
            }
          />
        </div>

        <div className="flex flex-col items-start gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="text-2xl font-semibold">
            {formatPrice(product.priceCents)}
          </p>
          <StockBadge stock={product.stock} showInStock />
          <p className="text-muted-foreground">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
