export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "out" | "low" | "in";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in";
}
