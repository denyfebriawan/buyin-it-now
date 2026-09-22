import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getAuditLog } from "@/lib/admin-users";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export function generateMetadata() {
  return adminMetadata("Audit log");
}

// A Postgres INTEGER holds at most 2^31 - 1. The bookmark here is a log
// entry's own id, not a user id, so it gets its own tiny parser rather than
// reusing parseUserId or parseOrderId for something they don't mean.
const MAX_INT = 2_147_483_647;
function parseLogCursor(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && id <= MAX_INT ? id : null;
}

export default async function AdminAuditLogPage({
  searchParams,
}: PageProps<"/admin/users/log">) {
  await requireAdmin();

  const { before } = await searchParams;
  const cursor = typeof before === "string" ? parseLogCursor(before) : null;

  const { entries, nextBefore } = await getAuditLog(cursor ?? undefined);

  return (
    <div>
      <Link
        href="/admin/users"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        All users
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Audit log
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every promotion and demotion, most recent first.
      </p>

      {entries.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          {cursor === null ? "Nothing has been logged yet." : "No older entries."}
        </p>
      ) : (
        <ul className="mt-6 max-w-2xl divide-y border-y text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="py-3">
              <Link
                href={`/admin/users/${entry.actor.id}`}
                className="font-medium underline underline-offset-4"
              >
                {entry.actor.name}
              </Link>{" "}
              {entry.action === "PROMOTED" ? "promoted" : "demoted"}{" "}
              <Link
                href={`/admin/users/${entry.target.id}`}
                className="font-medium underline underline-offset-4"
              >
                {entry.target.name}
              </Link>{" "}
              {entry.action === "PROMOTED" ? "to admin" : "to customer"}
              <p className="mt-1 text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {nextBefore !== null && (
        <div className="mt-6 flex justify-center">
          <Link
            href={`/admin/users/log?before=${nextBefore}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Older entries
          </Link>
        </div>
      )}
      {cursor !== null && (
        <div className="mt-3 flex justify-center">
          <Link
            href="/admin/users/log"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Back to newest
          </Link>
        </div>
      )}
    </div>
  );
}
