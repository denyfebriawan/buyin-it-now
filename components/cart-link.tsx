import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getCartCount } from "@/lib/cart";

// The cart icon with a count badge. The count is hidden while the cart is empty
// (and for visitors who are not logged in), and reads "99+" above 99. The
// number is also in the link's label, so screen readers say "Cart, 3 items"
// and the visual badge itself is hidden from them to avoid saying it twice.
export async function CartLink() {
  const count = await getCartCount();

  const label =
    count === 0 ? "Cart" : `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <Link
      href="/cart"
      aria-label={label}
      className={buttonVariants({
        variant: "ghost",
        size: "icon",
        className: "relative",
      })}
    >
      <ShoppingCart />
      {count > 0 && (
        <span
          aria-hidden="true"
          data-testid="cart-count"
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none font-medium text-white tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
