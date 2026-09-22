import Link from "next/link";

import { type AdminRoleFilter, getAdminUsers } from "@/lib/admin-users";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseUserId } from "@/lib/validation/user";

export function generateMetadata() {
  return adminMetadata("Users");
}

const SEARCH_MAX_LENGTH = 254; // as long as the email addresses it searches

const ROLE_TABS: { value: AdminRoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "CUSTOMER", label: "Customers" },
  { value: "ADMIN", label: "Admins" },
];

// Builds a link that keeps the current filter and search. Only values that
// differ from the default end up in the address.
function listHref(params: {
  role: AdminRoleFilter;
  search?: string;
  before?: number;
}) {
  const query = new URLSearchParams();
  if (params.role !== "all") query.set("role", params.role);
  if (params.search) query.set("q", params.search);
  if (params.before) query.set("before", String(params.before));
  const text = query.toString();
  return text ? `/admin/users?${text}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  await requireAdmin();

  const { role: rawRole, q, before } = await searchParams;
  // The address is user input. Anything unexpected (a value given twice, a
  // role that is not one of the three, a bookmark that is not a number) falls
  // back to the default instead of causing an error.
  const role: AdminRoleFilter = ROLE_TABS.some((tab) => tab.value === rawRole)
    ? (rawRole as AdminRoleFilter)
    : "all";
  const search =
    typeof q === "string" ? q.trim().slice(0, SEARCH_MAX_LENGTH) : "";
  const cursor = typeof before === "string" ? parseUserId(before) : null;

  const { users, nextBefore } = await getAdminUsers({
    role,
    search: search || undefined,
    before: cursor ?? undefined,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <Link
          href="/admin/users/log"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Audit log
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Role" className="flex gap-1">
          {ROLE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={listHref({ role: tab.value, search })}
              aria-current={role === tab.value ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted",
                role === tab.value && "bg-muted",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* A plain GET form: submitting it just opens the same page with ?q=. */}
        <form method="get" action="/admin/users" className="flex gap-2">
          {role !== "all" && <input type="hidden" name="role" value={role} />}
          <Input
            name="q"
            type="search"
            placeholder="Search by name or email"
            aria-label="Search users by name or email"
            maxLength={SEARCH_MAX_LENGTH}
            defaultValue={search}
            className="w-full sm:w-64"
          />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Search
          </button>
        </form>
      </div>

      {users.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          {search
            ? `No users match "${search}".`
            : cursor
              ? "No older users."
              : "No users yet."}
        </p>
      ) : (
        <ul className="mt-6 divide-y border-y">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                href={`/admin/users/${user.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-medium">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email} · Joined {formatDateTime(user.createdAt)} ·{" "}
                    {user._count.orders}{" "}
                    {user._count.orders === 1 ? "order" : "orders"}
                  </p>
                </div>
                <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                  {user.role === "ADMIN" ? "Admin" : "Customer"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {nextBefore !== null && (
        <div className="mt-6 flex justify-center">
          <Link
            href={listHref({ role, search, before: nextBefore })}
            className={buttonVariants({ variant: "outline" })}
          >
            Older users
          </Link>
        </div>
      )}
      {cursor !== null && (
        <div className="mt-3 flex justify-center">
          <Link
            href={listHref({ role, search })}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Back to newest
          </Link>
        </div>
      )}
    </div>
  );
}
