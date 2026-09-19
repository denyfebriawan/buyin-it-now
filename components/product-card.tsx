import Image from "next/image";
import Link from "next/link";

import { StockBadge } from "@/components/stock-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";
import { getStockStatus } from "@/lib/stock";

export function ProductCard({ product }: { product: Product }) {
  const { id, name, description, priceCents, imageUrl, stock } = product;
  const soldOut = getStockStatus(stock) === "out";

  return (
    <Card className="relative h-full pt-0 transition-shadow hover:ring-foreground/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
      <div className="relative aspect-square bg-muted">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={
            soldOut ? "object-cover opacity-60 grayscale" : "object-cover"
          }
        />
        <div className="absolute top-2 left-2">
          <StockBadge stock={stock} />
        </div>
      </div>
      <CardHeader>
        <CardTitle>
          {/* The ::after layer stretches this link over the whole card, so
              the entire card is clickable while the title stays the link text. */}
          <Link
            href={`/products/${id}`}
            className="outline-none after:absolute after:inset-0"
          >
            {name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="text-lg font-semibold">{formatPrice(priceCents)}</p>
      </CardContent>
    </Card>
  );
}
