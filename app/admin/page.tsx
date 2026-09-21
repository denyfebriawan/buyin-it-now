import { adminMetadata, requireAdmin } from "@/lib/auth";

export function generateMetadata() {
  return adminMetadata("Admin");
}

export default async function AdminOverviewPage() {
  // Checked here as well as in the layout: a page must never rely on a layout.
  const admin = await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {admin.name} ({admin.email}).
      </p>
    </div>
  );
}
