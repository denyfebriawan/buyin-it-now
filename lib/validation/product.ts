import * as z from "zod";

export const PRODUCT_NAME_MAX_LENGTH = 120;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 2000;
export const IMAGE_URL_MAX_LENGTH = 300;

// Limits that keep every number comfortably inside a Postgres INTEGER
// (2^31 - 1), including an order total of many of these added together.
export const MAX_PRICE_CENTS = 1_000_000; // $10,000.00
export const MAX_STOCK = 1_000_000;

// next/image refuses to load pictures from hosts that are not listed in
// next.config.ts (images.remotePatterns), and a refused picture crashes the page
// it is on. So an admin can only enter addresses that the config allows. When
// the real image host arrives, change it here and in next.config.ts together.
const IMAGE_HOST = "picsum.photos";
const IMAGE_PATH_PREFIX = "/seed/";

const name = z
  .string({ error: "Enter a name." })
  .trim()
  .min(1, "Enter a name.")
  .max(
    PRODUCT_NAME_MAX_LENGTH,
    `Name must be ${PRODUCT_NAME_MAX_LENGTH} characters or fewer.`,
  );

const description = z
  .string({ error: "Enter a description." })
  .trim()
  .min(1, "Enter a description.")
  .max(
    PRODUCT_DESCRIPTION_MAX_LENGTH,
    `Description must be ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
  );

// The form asks for dollars ("19.99") but the database stores whole cents. The
// text is turned into cents with integer arithmetic on the digits, never
// Number("19.99") * 100, which gives 1998.9999999999998 for some prices.
const PRICE_ERROR = "Enter a price from 0.01 to 10,000.00, like 19.99.";

const price = z
  .string({ error: PRICE_ERROR })
  .trim()
  .regex(/^\d{1,7}(\.\d{1,2})?$/, PRICE_ERROR)
  .transform((text) => {
    const [dollars, cents = ""] = text.split(".");
    return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  })
  .pipe(z.number().min(1, PRICE_ERROR).max(MAX_PRICE_CENTS, PRICE_ERROR));

const imageUrl = z
  .string({ error: "Enter an image address." })
  .trim()
  .max(IMAGE_URL_MAX_LENGTH, "That image address is too long.")
  .refine((text) => {
    try {
      const url = new URL(text);
      return (
        url.protocol === "https:" &&
        url.hostname === IMAGE_HOST &&
        url.pathname.startsWith(IMAGE_PATH_PREFIX)
      );
    } catch {
      return false; // not a URL at all
    }
  }, `For now images must come from https://${IMAGE_HOST}${IMAGE_PATH_PREFIX}..., for example https://${IMAGE_HOST}${IMAGE_PATH_PREFIX}blue-mug/600/600.`);

const STOCK_ERROR = `Enter a whole number from 0 to ${MAX_STOCK.toLocaleString("en-US")}.`;

const stock = z
  .string({ error: STOCK_ERROR })
  .trim()
  .regex(/^\d+$/, STOCK_ERROR)
  .transform(Number)
  .pipe(z.number().max(MAX_STOCK, STOCK_ERROR));

// z.object() drops any field not listed, so a forged extra field is ignored.
// Stock is not part of the edit form (see the adjust-stock schema below), so
// the two forms get their own schemas.
export const createProductSchema = z.object({
  name,
  description,
  price,
  imageUrl,
  stock,
});

export const updateProductSchema = z.object({
  name,
  description,
  price,
  imageUrl,
});

// A Postgres INTEGER holds at most 2^31 - 1. Larger ids would make a query
// throw instead of simply finding nothing.
const MAX_INT = 2_147_483_647;

// Form fields arrive as strings. Digits only, so "", "1e3", "0x10" and " 5 "
// are rejected instead of being quietly turned into numbers.
const productId = z
  .string({ error: "Invalid product." })
  .regex(/^\d+$/, "Invalid product.")
  .transform(Number)
  .pipe(z.number().min(1, "Invalid product.").max(MAX_INT, "Invalid product."));

export const productIdSchema = z.object({ productId });

export const updateProductWithIdSchema = updateProductSchema.extend({
  productId,
});

// Stock is changed by an amount ("+20", "-5"), never overwritten with a total.
// See adjustStock() in lib/admin-products.ts for why.
const DELTA_ERROR = "Enter a whole number like 20 or -5.";

const delta = z
  .string({ error: DELTA_ERROR })
  .trim()
  .regex(/^[+-]?\d+$/, DELTA_ERROR)
  .transform(Number)
  .pipe(
    z
      .number()
      .refine((n) => n !== 0, "Enter a number other than 0.")
      .refine((n) => Math.abs(n) <= MAX_STOCK, DELTA_ERROR),
  );

export const adjustStockSchema = z.object({ productId, delta });
