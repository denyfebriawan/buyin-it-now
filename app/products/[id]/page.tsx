import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/add-to-cart-form";
import { StockBadge } from "@/components/stock-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCartQuantity } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { getProductById, parseProductId } from "@/lib/products";
import { getStockStatus } from "@/lib/stock";
import { MAX_QUANTITY } from "@/lib/validation/cart";

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
  // The header already asked for the current user, and the answer is cached
  // for the request, so this costs no extra query.
  const user = await getCurrentUser();
  // How many more can still be added: the per-line limit minus what this user
  // already has in their cart. Only looked up for logged-in visitors.
  const inCart = user ? await getCartQuantity(product.id) : 0;
  const canAdd = Math.max(0, Math.min(product.stock, MAX_QUANTITY) - inCart);

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
          <StockBadge stock={product.stock} showCount />
          <p className="text-muted-foreground">{product.description}</p>

          {/* What is shown is only a convenience: addToCartAction checks the
              login itself, because it can be called without this page. */}
          <div className="mt-2">
            {soldOut ? (
              <Button size="lg" disabled>
                Out of stock
              </Button>
            ) : user && canAdd === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  You already have {inCart} in your cart, the most that can be
                  added.
                </p>
                <Link
                  href="/cart"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  View cart
                </Link>
              </div>
            ) : user ? (
              <AddToCartForm
                productId={product.id}
                maxQuantity={canAdd}
                inCart={inCart}
              />
            ) : (
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Log in to add to cart
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
