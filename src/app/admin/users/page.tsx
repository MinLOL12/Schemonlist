import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/badges";
import { EmptyState, Notice } from "@/components/notice";
import { BanControl, RoleForm } from "@/components/user-controls";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { getAdminUsers } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 64);
  await requireAdmin();
  const [users, viewer] = await Promise.all([getAdminUsers(q), getSessionUser()]);

  return (
    <div className="space-y-5">
      {params.message ? <Notice variant="success">{params.message}</Notice> : null}
      {params.error ? <Notice variant="error">{params.error}</Notice> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Accounts</h2>
          <p className="text-sm text-slate-400">
            Roles, bans and account details. Role changes are applied through
            admin-only database functions.
          </p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search username…"
            className="input sm:w-64"
            maxLength={64}
          />
          <button type="submit" className="btn btn-ghost btn-sm">Search</button>
        </form>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No accounts found">
          {q ? "Try a different search term." : "No players have signed in yet."}
        </EmptyState>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th>Account</th>
                  <th className="hidden sm:table-cell">Role</th>
                  <th className="text-right">Points</th>
                  <th className="hidden text-right md:table-cell">Records</th>
                  <th className="hidden text-right lg:table-cell">Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = viewer?.id === user.id;
                  return (
                    <tr key={user.id} className={user.is_banned ? "opacity-70" : undefined}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatar_url} name={user.username} size={32} />
                          <div className="min-w-0">
                            <Link
                              href={`/players/${user.username}`}
                              className="block truncate text-sm font-medium text-white hover:text-cyan-200"
                            >
                              {user.display_name ?? user.username}
                              {isSelf ? (
                                <span className="ml-2 rounded bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan-200">
                                  You
                                </span>
                              ) : null}
                            </Link>
                            <p className="truncate text-xs text-slate-500">
                              @{user.username}
                              {user.discord_username && user.discord_username !== user.username
                                ? ` · discord: ${user.discord_username}`
                                : ""}
                            </p>
                            {user.is_banned ? (
                              <p className="mt-1 text-xs text-rose-300">
                                Banned{user.ban_reason ? `: ${user.ban_reason}` : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div className="flex flex-col gap-1.5">
                          <RoleBadge role={user.role} />
                          {!isSelf ? <RoleForm userId={user.id} role={user.role} /> : null}
                        </div>
                      </td>
                      <td className="text-right font-mono text-sm text-cyan-200">{user.points}</td>
                      <td className="hidden text-right text-sm text-slate-300 md:table-cell">
                        {user.records_count}
                      </td>
                      <td className="hidden text-right text-xs text-slate-500 lg:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="text-right">
                        {isSelf ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : (
                          <BanControl userId={user.id} isBanned={user.is_banned} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Showing up to 200 accounts. Roles and bans are enforced by Row Level
        Security and database functions — being an admin in the UI alone does not
        grant database permissions.
      </p>
    </div>
  );
}
