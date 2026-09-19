import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Buyin It Now
        </Link>
        <Link
          href="/cart"
          aria-label="Cart"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ShoppingCart />
        </Link>
      </div>
    </header>
  );
}
