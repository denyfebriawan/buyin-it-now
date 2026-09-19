import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";

const LOW_STOCK_THRESHOLD = 5;

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <Badge variant="secondary">Out of stock</Badge>;
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <Badge variant="outline">Only {stock} left</Badge>;
  }
  return null;
}

export function ProductCard({ product }: { product: Product }) {
  const { name, description, priceCents, imageUrl, stock } = product;

  return (
    <Card className="h-full pt-0">
      <div className="relative aspect-square bg-muted">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={
            stock === 0 ? "object-cover opacity-60 grayscale" : "object-cover"
          }
        />
        <div className="absolute top-2 left-2">
          <StockBadge stock={stock} />
        </div>
      </div>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="text-lg font-semibold">{formatPrice(priceCents)}</p>
      </CardContent>
    </Card>
  );
}
