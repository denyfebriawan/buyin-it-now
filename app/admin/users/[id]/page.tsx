import Link from "next/link";
import { notFound } from "next/navigation";

import { demoteUserAction, promoteUserAction } from "@/app/actions/admin-users";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getAdminUser } from "@/lib/admin-users";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { parseUserId } from "@/lib/validation/user";

export function generateMetadata() {
  return adminMetadata("User detail");
}

export default async function AdminUserPage({
  params,
}: PageProps<"/admin/users/[id]">) {
  // requireAdmin() runs again below with the fetched user; this first call is
  // who is VIEWING the page, so the page can tell "your own account" apart
  // from "someone else's" when it decides whether to show a Demote button.
  const viewer = await requireAdmin();

  const { id: rawId } = await params;
  const id = parseUserId(rawId);
  if (id === null) notFound();

  const user = await getAdminUser(id);
  if (!user) notFound();

  const isSelf = user.id === viewer.id;

  return (
    <div>
      <Link
        href="/admin/users"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        All users
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
        <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
          {user.role === "ADMIN" ? "Admin" : "Customer"}
        </Badge>
        {isSelf && <Badge variant="secondary">You</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Joined {formatDateTime(user.createdAt)}
      </p>
      <p className="mt-1 text-sm">
        <Link
          href={`/admin/orders?q=${encodeURIComponent(user.email)}`}
          className="underline underline-offset-4"
        >
          {user._count.orders} {user._count.orders === 1 ? "order" : "orders"}
        </Link>
      </p>

      <section className="mt-8" aria-labelledby="role-heading">
        <h2 id="role-heading" className="mb-1 text-lg font-semibold">
          Role
        </h2>
        {isSelf ? (
          <p className="max-w-xl text-sm text-muted-foreground">
            This is your own account. To keep an admin from ever being locked
            out by mistake, you cannot demote yourself; ask another admin.
          </p>
        ) : user.role === "ADMIN" ? (
          <>
            <p className="mb-4 max-w-xl text-sm text-muted-foreground">
              Removes admin access. They keep their account and order history.
            </p>
            <form action={demoteUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <SubmitButton variant="destructive">
                Demote to customer
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <p className="mb-4 max-w-xl text-sm text-muted-foreground">
              Gives full access to this admin area, including managing other
              admins.
            </p>
            <form action={promoteUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <SubmitButton>Promote to admin</SubmitButton>
            </form>
          </>
        )}
      </section>

      <section className="mt-10" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 text-lg font-semibold">
          Role history
        </h2>
        {user.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody has changed this account&apos;s role.
          </p>
        ) : (
          <ul className="max-w-xl divide-y border-y text-sm">
            {user.history.map((entry) => (
              <li key={entry.id} className="py-2">
                {entry.action === "PROMOTED" ? "Promoted to admin" : "Demoted to customer"}{" "}
                by{" "}
                <Link
                  href={`/admin/users/${entry.actor.id}`}
                  className="underline underline-offset-4"
                >
                  {entry.actor.name}
                </Link>{" "}
                <span className="text-muted-foreground">
                  · {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
