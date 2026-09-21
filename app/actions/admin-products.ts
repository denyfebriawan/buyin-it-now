"use server";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";
import * as z from "zod";

import {
  adjustStock,
  archiveProduct,
  createProduct,
  restoreProduct,
  updateProduct,
} from "@/lib/admin-products";
import {
  adjustStockSchema,
  createProductSchema,
  productIdSchema,
  updateProductWithIdSchema,
} from "@/lib/validation/product";

// Every action here can be posted to directly, not only through our forms. The
// admin check is inside the lib/admin-products.ts function each one calls, so
// it cannot be skipped. Validation runs first because it is cheap and never
// touches the database.

// What the create and edit forms get back. The typed text is sent back so the
// admin does not have to retype it after a mistake.
export type ProductFormState =
  | {
      errors?: {
        name?: string[];
        description?: string[];
        price?: string[];
        imageUrl?: string[];
        stock?: string[];
      };
      values?: Record<string, string>;
      saved?: boolean;
    }
  | undefined;

// Only strings, so it is safe to send back: a form field can also hold a file.
function typedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: typedValues(formData),
    };
  }

  const { price, ...rest } = parsed.data;
  await createProduct({ ...rest, priceCents: price });

  // redirect() works by throwing, so it must stay outside any try/catch.
  redirect("/admin/products");
}

export async function updateProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = updateProductWithIdSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: typedValues(formData),
    };
  }

  const { productId, price, ...rest } = parsed.data;
  const found = await updateProduct(productId, { ...rest, priceCents: price });
  if (!found) notFound();

  refresh();
  return { saved: true, values: typedValues(formData) };
}

export type AdjustStockState =
  | { status: "success" | "error"; message: string }
  | undefined;

export async function adjustStockAction(
  _previousState: AdjustStockState,
  formData: FormData,
): Promise<AdjustStockState> {
  const parsed = adjustStockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      status: "error",
      message: fieldErrors.delta?.[0] ?? "Invalid request.",
    };
  }

  const result = await adjustStock(parsed.data.productId, parsed.data.delta);

  if (!result.ok) {
    return {
      status: "error",
      message: {
        "not-found": "This product no longer exists.",
        "below-zero": "That would make the stock negative.",
        "too-many": "That is more stock than the shop allows.",
      }[result.reason],
    };
  }

  refresh();
  return { status: "success", message: `Stock is now ${result.stock}.` };
}

// The two buttons below are plain forms with no result to show: they ignore
// invalid input silently (only a forged request can send it) and re-render the
// page, which then shows the new state.
export async function archiveProductAction(formData: FormData): Promise<void> {
  const parsed = productIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await archiveProduct(parsed.data.productId);
  refresh();
}

export async function restoreProductAction(formData: FormData): Promise<void> {
  const parsed = productIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await restoreProduct(parsed.data.productId);
  refresh();
}
