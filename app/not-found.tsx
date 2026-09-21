import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// One 404 page for the whole site. Every way of getting a 404 (a URL that matches
// no route, notFound() in a page, notFound() in a layout such as the admin
// gate) ends up here, so a visitor cannot tell them apart.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">404</h1>
      <p className="text-muted-foreground">This page could not be found.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Back to the shop
      </Link>
    </div>
  );
}
