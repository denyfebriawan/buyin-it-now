"use server";

import { refresh } from "next/cache";

import { demoteUser, promoteUser } from "@/lib/admin-users";
import { userIdSchema } from "@/lib/validation/user";

// Can be posted to directly, not only through the buttons, so the admin check
// and the self-demotion / last-admin rules inside lib/admin-users.ts cannot be
// bypassed. Like the product archive/restore and order cancel actions, these
// return nothing and ignore invalid input silently: the buttons only ever send
// a real user id, so bad input means a forged request. The account's new role
// badge, and the button flipping to the other one, are the feedback.
export async function promoteUserAction(formData: FormData): Promise<void> {
  const parsed = userIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await promoteUser(parsed.data.userId);
  refresh();
}

export async function demoteUserAction(formData: FormData): Promise<void> {
  const parsed = userIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  await demoteUser(parsed.data.userId);
  refresh();
}
