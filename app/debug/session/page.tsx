// TEMPORARY: built only to see getCurrentUser() work in mechanism 5 of the
// auth build-out. Delete this whole app/debug folder before the branch is
// done.
import { getCurrentUser } from "@/lib/auth";

export default async function DebugSessionPage() {
  const user = await getCurrentUser();

  return (
    <pre className="mx-auto w-full max-w-2xl px-4 py-8">
      {user ? JSON.stringify(user, null, 2) : "Not logged in"}
    </pre>
  );
}
