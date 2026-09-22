import "server-only";

import type { Role } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth";
import { escapeLike } from "@/lib/db";
import { prisma } from "@/lib/prisma";

// Everything the admin does with accounts lives here. Every function starts
// with requireAdmin(): the layout's check only keeps customers from seeing the
// admin pages, it cannot protect a Server Action that someone posts to
// directly.

export const ADMIN_USERS_PER_PAGE = 20;

export type AdminRoleFilter = Role | "all";

// One page of every account, newest first, using the same bookmark (keyset)
// paging as the rest of the admin area. `search` matches the name or email
// (case-insensitive, substring).
export async function getAdminUsers({
  role,
  search,
  before,
}: {
  role: AdminRoleFilter;
  search?: string;
  before?: number;
}) {
  await requireAdmin();

  const rows = await prisma.user.findMany({
    where: {
      ...(role !== "all" ? { role } : {}),
      ...(before ? { id: { lt: before } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: escapeLike(search), mode: "insensitive" } },
              { email: { contains: escapeLike(search), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { id: "desc" },
    take: ADMIN_USERS_PER_PAGE + 1,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  const hasMore = rows.length > ADMIN_USERS_PER_PAGE;
  const users = hasMore ? rows.slice(0, ADMIN_USERS_PER_PAGE) : rows;

  return {
    users,
    nextBefore: hasMore ? users[users.length - 1].id : null,
  };
}

const AUDIT_ENTRY_SELECT = {
  id: true,
  action: true,
  createdAt: true,
  actor: { select: { id: true, name: true, email: true } },
} as const;

// One account, with its recent history (promotions and demotions done TO it,
// not by it: an admin's own actions on other accounts show up on THOSE
// accounts' pages and in the site-wide log below).
export async function getAdminUser(id: number) {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true } },
      auditActionsOn: {
        orderBy: { id: "desc" },
        take: 20,
        select: AUDIT_ENTRY_SELECT,
      },
    },
  });
  if (!user) return null;

  const { auditActionsOn, ...rest } = user;
  return { ...rest, history: auditActionsOn };
}

export const AUDIT_LOG_PER_PAGE = 30;

// The site-wide log, every promotion and demotion, newest first, with the
// same bookmark paging as everything else in the admin area.
export async function getAuditLog(before?: number) {
  await requireAdmin();

  const rows = await prisma.adminAuditLog.findMany({
    where: before ? { id: { lt: before } } : undefined,
    orderBy: { id: "desc" },
    take: AUDIT_LOG_PER_PAGE + 1,
    select: {
      ...AUDIT_ENTRY_SELECT,
      target: { select: { id: true, name: true, email: true } },
    },
  });

  const hasMore = rows.length > AUDIT_LOG_PER_PAGE;
  const entries = hasMore ? rows.slice(0, AUDIT_LOG_PER_PAGE) : rows;

  return {
    entries,
    nextBefore: hasMore ? entries[entries.length - 1].id : null,
  };
}

export type ChangeRoleResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "already" | "self" | "last-admin" };

// Makes an account an admin. Promoting yourself cannot happen through the UI
// (you are already an admin to be looking at this page at all), but the
// function still checks, so a forged request cannot be used to, say, promote
// someone by re-sending their own id under a different account's cookie in a
// way that skips the "already" check below.
export async function promoteUser(targetId: number): Promise<ChangeRoleResult> {
  const admin = await requireAdmin();

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target) return { ok: false, reason: "not-found" };
    if (target.role === "ADMIN") return { ok: false, reason: "already" };

    await tx.user.update({
      where: { id: targetId },
      data: { role: "ADMIN" },
    });
    await tx.adminAuditLog.create({
      data: { actorId: admin.id, targetId, action: "PROMOTED" },
    });
    return { ok: true };
  });
}

// Takes admin away from an account. Two rules, enforced here rather than only
// in the page, so a forged request cannot bypass them:
//
//   - An admin can never demote themselves. There is no "give it back"
//     button once you have locked yourself out, so this is refused outright
//     rather than needing a second admin to undo it.
//   - The last admin can never be demoted, so the app is never left with no
//     way to reach the admin area at all (short of scripts/make-admin.ts).
export async function demoteUser(targetId: number): Promise<ChangeRoleResult> {
  const admin = await requireAdmin();
  if (targetId === admin.id) return { ok: false, reason: "self" };

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!target) return { ok: false, reason: "not-found" };
    if (target.role !== "ADMIN") return { ok: false, reason: "already" };

    // Lock every admin row before counting. Two admins demoting two different
    // people at the same moment then take turns: the second one sees the
    // first one's result, so the count can never be read stale and the last
    // admin can never slip through. The same technique scripts/make-admin.ts
    // uses for the same reason.
    const admins = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM users WHERE role = 'ADMIN' FOR UPDATE
    `;
    if (admins.length <= 1) return { ok: false, reason: "last-admin" };

    await tx.user.update({
      where: { id: targetId },
      data: { role: "CUSTOMER" },
    });
    await tx.adminAuditLog.create({
      data: { actorId: admin.id, targetId, action: "DEMOTED" },
    });
    return { ok: true };
  });
}
