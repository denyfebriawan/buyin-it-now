import "server-only";

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
