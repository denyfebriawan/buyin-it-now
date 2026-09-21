import * as z from "zod";

// A sanity ceiling for one request. The real limit is the product's stock,
// which the database enforces, so this only stops absurd values.
export const MAX_QUANTITY = 99;

// A Postgres INTEGER holds at most 2^31 - 1. Larger ids would make a query
// throw instead of simply finding nothing.
const MAX_INT = 2_147_483_647;

// Form fields arrive as strings. Digits only, so "", "1e3", "0x10", "-1" and
// " 5 " are all rejected instead of being quietly turned into numbers.
const wholeNumber = z
  .string({ error: "Invalid number." })
  .regex(/^\d+$/, "Invalid number.")
  .transform(Number)
  .pipe(z.number().min(1, "Invalid number.").max(MAX_INT, "Invalid number."));

const quantity = wholeNumber.pipe(
  z.number().max(MAX_QUANTITY, `Quantity must be ${MAX_QUANTITY} or fewer.`),
);

// z.object() drops any field not listed, so a forged extra field such as a
// price is ignored. The cart only ever accepts ids and quantities.
export const addToCartSchema = z.object({
  productId: wholeNumber,
  quantity,
});

export const setQuantitySchema = z.object({
  cartItemId: wholeNumber,
  quantity,
});

export const removeItemSchema = z.object({
  cartItemId: wholeNumber,
});
