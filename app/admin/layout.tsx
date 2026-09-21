import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  // Keeps customers from ever seeing the admin navigation. This is only a
  // convenience: layouts do not re-run on every navigation, so every admin
  // page, data function and action checks requireAdmin() for itself.
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-48 md:shrink-0">
          <AdminNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
