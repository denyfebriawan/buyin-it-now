import "server-only";

import { redirect } from "next/navigation";
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
