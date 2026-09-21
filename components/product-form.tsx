"use client";

import { useActionState } from "react";

import type { ProductFormState } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IMAGE_URL_MAX_LENGTH,
  MAX_STOCK,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
} from "@/lib/validation/product";

// The text boxes' starting values. On the edit page they are the product as it
// is stored; on the create page they are empty.
export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
};

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {messages[0]}
    </p>
  );
}

// One form for both creating and editing. The page decides which Server Action
// runs (passed in as `action`), so this file only knows how to show fields and
// errors. The stock box exists only when creating: an existing product's stock
// is changed with the separate "adjust stock" form (see adjustStock()).
export function ProductForm({
  action,
  initial,
  productId,
  submitLabel,
}: {
  action: (
    state: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
  initial: ProductFormValues;
  // Present when editing: sent along as a hidden field.
  productId?: number;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;
  // React empties a form after its action finishes, so every box gets its
  // value from here: what was last typed if there is one, else the starting
  // value. That keeps the text in place after a validation error or a save.
  const value = (field: keyof ProductFormValues) =>
    state?.values?.[field] ?? initial[field];

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {productId !== undefined && (
        <input type="hidden" name="productId" value={productId} />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          defaultValue={value("name")}
          aria-invalid={!!errors?.name}
          aria-describedby={errors?.name ? "name-error" : undefined}
        />
        <FieldError id="name-error" messages={errors?.name} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
          defaultValue={value("description")}
          aria-invalid={!!errors?.description}
          aria-describedby={
            errors?.description ? "description-error" : undefined
          }
          className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"
        />
        <FieldError id="description-error" messages={errors?.description} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="price">Price (USD)</Label>
        <Input
          id="price"
          name="price"
          inputMode="decimal"
          required
          placeholder="19.99"
          defaultValue={value("price")}
          aria-invalid={!!errors?.price}
          aria-describedby={errors?.price ? "price-error" : undefined}
          className="w-40"
        />
        <FieldError id="price-error" messages={errors?.price} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="imageUrl">Image address</Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          type="url"
          required
          maxLength={IMAGE_URL_MAX_LENGTH}
          placeholder="https://picsum.photos/seed/blue-mug/600/600"
          defaultValue={value("imageUrl")}
          aria-invalid={!!errors?.imageUrl}
          aria-describedby={errors?.imageUrl ? "imageUrl-error" : "imageUrl-hint"}
        />
        <p id="imageUrl-hint" className="text-sm text-muted-foreground">
          For now only picsum.photos placeholder images are allowed.
        </p>
        <FieldError id="imageUrl-error" messages={errors?.imageUrl} />
      </div>

      {productId === undefined && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="stock">Starting stock</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_STOCK}
            step={1}
            required
            defaultValue={state?.values?.stock ?? "0"}
            aria-invalid={!!errors?.stock}
            aria-describedby={errors?.stock ? "stock-error" : undefined}
            className="w-40"
          />
          <FieldError id="stock-error" messages={errors?.stock} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        {/* Always in the page so screen readers announce it when it appears. */}
        <p role="status" className="text-sm">
          {state?.saved ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}
