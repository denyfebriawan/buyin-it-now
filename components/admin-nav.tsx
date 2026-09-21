"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

// Each admin section adds its own entry here when it arrives, so there are no
// links to pages that do not exist yet.
const SECTIONS = [{ href: "/admin", label: "Overview" }];

// Only the highlight of the current page needs the browser (usePathname), so
// this small navigation is the one Client Component in the admin shell.
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-row gap-1 md:flex-col">
      {SECTIONS.map(({ href, label }) => {
        const current =
          href === "/admin"
            ? pathname === "/admin"
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted",
              current && "bg-muted",
            )}
          >
            {label}
          </Link>
        );
      })}

      <Link
        href="/"
        className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted md:mt-4"
      >
        Back to shop
      </Link>
    </nav>
  );
}
