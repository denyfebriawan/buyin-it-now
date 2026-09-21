const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Prices are stored as integer cents, so 1999 becomes "$19.99".
export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
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
