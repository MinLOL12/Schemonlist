"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview", adminOnly: false },
  { href: "/admin/submissions", label: "Submissions", adminOnly: false },
  { href: "/admin/levels", label: "Levels", adminOnly: true },
  { href: "/admin/users", label: "Accounts", adminOnly: true },
  { href: "/admin/audit", label: "Audit log", adminOnly: true },
];

export function AdminNav({
  pending,
  role,
}: {
  pending: number;
  role: "player" | "moderator" | "admin";
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <div className="panel mb-6 flex flex-wrap items-center gap-1 p-1.5">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {item.label}
            {item.href === "/admin/submissions" && pending > 0 ? (
              <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                {pending}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link
        href="/setup"
        className="ml-auto rounded-lg px-3 py-1.5 text-xs text-slate-500 transition hover:text-slate-300"
      >
        Setup →
      </Link>
    </div>
  );
}
