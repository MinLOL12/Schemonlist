"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, DiscordIcon } from "@/components/avatar";
import { signOutUser } from "@/actions/auth";
import type { SessionUser } from "@/lib/types";

const LINKS = [
  { href: "/list", label: "The List" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/submit", label: "Submit" },
];

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-sky-500 to-fuchsia-500 shadow-[0_0_24px_-6px_rgba(34,211,238,0.8)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-950" fill="currentColor">
          <path d="M4 4h7v7H4zm9 9h7v7h-7z" />
          <path d="M13 4h7v7h-7zM4 13h7v7H4z" opacity="0.55" />
        </svg>
      </span>
      <span className="text-lg font-black tracking-tight text-white">
        SCHEMON<span className="text-gradient">LIST</span>
      </span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const links = [
    ...LINKS,
    ...(isStaff ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05060e]/85 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 transition hover:border-white/25 hover:bg-white/10">
                <Avatar src={user.avatar_url} name={user.username} size={26} />
                <span className="hidden max-w-28 truncate text-sm font-medium text-slate-200 sm:block">
                  {user.display_name ?? user.username}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div className="panel absolute right-0 z-50 mt-2 w-60 overflow-hidden p-2 shadow-2xl shadow-black/60">
                <div className="border-b border-white/10 px-2 pb-2.5 pt-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.display_name ?? user.username}
                  </p>
                  <p className="truncate text-xs text-slate-500">@{user.username}</p>
                  {user.is_banned ? (
                    <p className="mt-1 text-xs font-semibold text-rose-300">Account banned</p>
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-col">
                  <Link
                    href={`/players/${user.username}`}
                    className="rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    Public profile
                  </Link>
                  <Link
                    href="/profile"
                    className="rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    My submissions
                  </Link>
                  {isStaff ? (
                    <Link
                      href="/admin"
                      className="rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                    >
                      Admin panel
                    </Link>
                  ) : null}
                  <form action={signOutUser}>
                    <button
                      type="submit"
                      className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </details>
          ) : (
            <Link href="/auth/login" className="btn btn-primary btn-sm sm:px-4 sm:py-2.5">
              <DiscordIcon />
              <span className="hidden sm:inline">Sign in with Discord</span>
              <span className="sm:hidden">Sign in</span>
            </Link>
          )}
        </div>
      </div>

      {/* Compact nav for small screens */}
      <div className="border-t border-white/5 md:hidden">
        <nav className="shell flex gap-1 overflow-x-auto py-2">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}
