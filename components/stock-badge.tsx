import { Badge } from "@/components/ui/badge";
import { getStockStatus } from "@/lib/stock";

// The catalog only flags unusual stock levels. The detail page passes
// showCount so the shopper always sees the exact number left, instead of a
// vague "In stock" they would have to guess about.
export function StockBadge({
  stock,
  showCount = false,
}: {
  stock: number;
  showCount?: boolean;
}) {
  const status = getStockStatus(stock);

  if (status === "out") {
    return <Badge variant="secondary">Out of stock</Badge>;
  }
  if (status === "low") {
    return <Badge variant="outline">Only {stock} left</Badge>;
  }
  return showCount ? (
    <Badge variant="outline">{stock.toLocaleString("en-US")} in stock</Badge>
  ) : null;
}
