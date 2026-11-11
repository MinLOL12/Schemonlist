import { AdminNav } from "@/components/admin-nav";
import { requireStaff } from "@/lib/auth";
import { getPendingCount } from "@/lib/data";

export const metadata = { title: "Admin" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();
  const pending = await getPendingCount();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Staff area</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Admin panel</h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as @{user.username} · <span className="capitalize">{user.role}</span>
          </p>
        </div>
        <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/[0.06] px-3 py-2 text-xs text-fuchsia-100">
          Every change here is written to the audit log.
        </div>
      </div>

      <AdminNav pending={pending} role={user.role} />
      {children}
    </div>
  );
}
