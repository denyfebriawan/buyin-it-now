import Link from "next/link";

import { AuthNav } from "@/components/auth-nav";
import { CartLink } from "@/components/cart-link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Buyin It Now
        </Link>
        <div className="flex items-center gap-1">
          <AuthNav />
          <CartLink />
        </div>
      </div>
    </header>
  );
}
