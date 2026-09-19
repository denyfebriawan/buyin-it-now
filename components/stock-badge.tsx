import { Badge } from "@/components/ui/badge";
import { getStockStatus } from "@/lib/stock";

// The catalog only flags unusual stock levels. The detail page also shows
// "In stock" so the shopper always sees an availability message.
export function StockBadge({
  stock,
  showInStock = false,
}: {
  stock: number;
  showInStock?: boolean;
}) {
  const status = getStockStatus(stock);

  if (status === "out") {
    return <Badge variant="secondary">Out of stock</Badge>;
  }
  if (status === "low") {
    return <Badge variant="outline">Only {stock} left</Badge>;
  }
  return showInStock ? <Badge variant="outline">In stock</Badge> : null;
}
