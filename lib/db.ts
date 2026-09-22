import "server-only";

// In a LIKE/ILIKE pattern, % means "anything" and _ means "any one character".
// Prisma's `contains` does not escape them (the value is only wrapped in
// %...%), so typing "%" would match every row. Putting a backslash in front
// makes them ordinary characters; the backslash itself needs escaping first.
// Shared by every admin search (products by name, orders by customer).
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}
