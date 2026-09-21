"use server";

import { refresh } from "next/cache";

import { addToCart, removeCartItem, setCartItemQuantity } from "@/lib/cart";
import {
  addToCartSchema,
  MAX_QUANTITY,
  removeItemSchema,
  setQuantitySchema,
} from "@/lib/validation/cart";

export type AddToCartState =
  | { status: "success" | "error"; message: string }
  | undefined;

// A Server Action can be posted to directly, not only through our form. The
// login check is inside addToCart(), which redirects anonymous visitors, so it
// cannot be skipped. It is not repeated here on purpose: React's cache() does
// not de-duplicate calls made inside an action, so a second check would cost a
// second database query on every add. Validating first is harmless: it only
// runs cheap in-memory checks and never touches the database.
export async function addToCartAction(
  _previousState: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const parsed = addToCartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: `Choose a quantity from 1 to ${MAX_QUANTITY}.`,
    };
  }

  const result = await addToCart(parsed.data.productId, parsed.data.quantity);

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "out-of-stock"
          ? "Sorry, this item is out of stock."
          : "This product is no longer available.",
    };
  }

  // The product page shows how many more can be added, which just changed, so
  // re-render it. (Nothing needed refreshing before this page depended on the
  // cart.)
  refresh();

  // The final quantity is reported, not the requested one: if the stock cap
  // applied, the customer sees what is really in their cart.
  return {
    status: "success",
    message: `Added. You now have ${result.quantity} in your cart.`,
  };
}

// The two actions below are used by buttons ON the cart page, so after they
// change the data they call refresh() to re-render that page. They return
// nothing and ignore invalid input silently: the buttons only ever send valid
// values, so bad input can only come from a forged request. The login check and
// the "only my own cart" rule live inside the cart functions they call.
export async function updateCartItemAction(formData: FormData): Promise<void> {
  const parsed = setQuantitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await setCartItemQuantity(parsed.data.cartItemId, parsed.data.quantity);
  refresh();
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const parsed = removeItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await removeCartItem(parsed.data.cartItemId);
  refresh();
}
