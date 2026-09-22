import * as z from "zod";

// A Postgres INTEGER holds at most 2^31 - 1, which is also the largest total an
// order can have.
const MAX_INT = 2_147_483_647;

// The only thing the "Place order" form sends: the total the buyer saw. Digits
// only, so "", "-1", "1e3", "0x10" and " 5" are all rejected. Zero is allowed
// (a cart of free items). It is only compared with the real total, never used
// as a price, and z.object() drops any other field a forged request adds.
export const placeOrderSchema = z.object({
  expectedTotalCents: z
    .string({ error: "Invalid total." })
    .regex(/^\d+$/, "Invalid total.")
    .transform(Number)
    .pipe(z.number().max(MAX_INT, "Invalid total.")),
});

// Turns an order id from the URL ("12") into 12. Anything else ("abc", "0",
// "-1", "1.5", a number too big for the database) returns null, which the page
// treats as "no such order".
export function parseOrderId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && id <= MAX_INT ? id : null;
}

// The admin "Cancel order" form sends only which order. Digits only, same rule
// as parseOrderId above but as a schema, for a Server Action's hidden field.
export const orderIdSchema = z.object({
  orderId: z
    .string({ error: "Invalid order." })
    .regex(/^\d+$/, "Invalid order.")
    .transform(Number)
    .pipe(z.number().min(1, "Invalid order.").max(MAX_INT, "Invalid order.")),
});
