import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function OrderNotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Order not found</h1>
      <p className="mt-2 text-muted-foreground">
        This order does not exist, or it is not yours to view.
      </p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        Back to all products
      </Link>
    </div>
  );
}
