import type { OrderStatus } from "@/generated/prisma/client";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Prices are stored as integer cents, so 1999 becomes "$19.99".
export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}

// 1999 becomes "19.99", the plain form a price box in a form expects (no
// currency sign, no thousands separators). Integer arithmetic, no floats.
export function formatPriceInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

// Always UTC and always labelled, so the text does not depend on which server
// or which browser produced it.
export function formatDateTime(date: Date): string {
  return `${dateTime.format(date)} UTC`;
}

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid (simulated)",
  CANCELLED: "Cancelled",
};

export function formatOrderStatus(status: OrderStatus): string {
  return ORDER_STATUS_LABEL[status];
}
