const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Prices are stored as integer cents, so 1999 becomes "$19.99".
export function formatPrice(cents: number): string {
  return usd.format(cents / 100);
}
