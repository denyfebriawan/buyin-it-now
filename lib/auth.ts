import "server-only";

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Returns the logged-in user, or null if nobody's logged in. This never
// redirects: it's meant for places that adapt to login state, like a header
// showing "Log in" or "Hi, <name>". Pages that must have a logged-in user
// (checkout, order history) get a stricter check later, in the Data Access
// Layer, built on top of this.
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  // Looked up fresh on every request rather than trusted from the token, so
  // a deleted account or a role change takes effect immediately, not after
  // the token's 7-day expiry.
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
});

// The gate for anything that needs a logged-in user, such as a protected page
// or a Server Action. Anonymous visitors are sent to /login. redirect() works
// by throwing, so nothing after this call runs for them, and the user it
// returns is never null.
//
// Call it as close to the data as possible (inside the function that reads or
// changes protected data), not only in a page or layout: a layout does not
// re-run on every navigation, and Server Actions can be posted to directly.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// The gate for everything in /admin: pages, data functions and Server Actions.
// Anonymous visitors are sent to /login. A logged-in customer gets a plain 404,
// the same page as any URL that does not exist, so nobody can tell an admin
// area is there.
//
// The role comes from getCurrentUser(), which reads it fresh from the database
// on every request (the login token holds only an id). Demoting an admin
// therefore takes effect on their very next request, with no logout needed.
//
// Like requireUser(), call it as close to the data as possible: every admin
// data function and action must call it itself. The check in the admin layout
// is only a convenience that keeps customers from seeing the admin chrome:
// layouts do not re-run on every navigation, and Server Actions can be posted
// to directly.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") notFound();
  return user;
}

// The tab title for an admin page. A page's `metadata` is worked out separately
// from its layout, so a plain `metadata = { title: "Admin" }` would show
// "Admin" in a customer's tab even though the layout answers them with a 404.
// Only admins get the title. Everyone else gets the default one, exactly what
// the 404 page shows. (getCurrentUser is cached, so this costs no extra query.)
export async function adminMetadata(title: string): Promise<Metadata> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? { title } : {};
}
