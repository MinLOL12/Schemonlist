import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar, DiscordIcon } from "@/components/avatar";
import { KindBadge, RoleBadge, StatusBadge } from "@/components/badges";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { EmptyState, Notice } from "@/components/notice";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { deleteRecordAction } from "@/actions/records";
import { getSessionUser } from "@/lib/auth";
import { getMyRecords } from "@/lib/data";
import { formatDate, safeDecode } from "@/lib/format";
import { ROLE_META } from "@/lib/points";
import { demoMode } from "@/lib/config";

export const metadata = { title: "My account" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fprofile");

  const [records, params] = await Promise.all([getMyRecords(user.id), searchParams]);
  const approved = records.filter((record) => record.status === "approved");
  const pending = records.filter((record) => record.status === "pending");
  const rejected = records.filter((record) => record.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white">My account</h1>
        </div>
        <Link href={`/players/${user.username}`} className="btn btn-ghost btn-sm">
          View public profile →
        </Link>
      </div>

      {params.message ? (
        <Notice variant="success">{safeDecode(params.message)}</Notice>
      ) : null}
      {params.error ? (
        <Notice variant="error">{safeDecode(params.error)}</Notice>
      ) : null}

      {user.is_banned ? (
        <Notice variant="error" title="Account banned">
          Your account is banned. You can still browse the list, but new
          submissions are blocked. Contact an administrator for details.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <Avatar src={user.avatar_url} name={user.username} size={64} />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-white">
                {user.display_name ?? user.username}
              </p>
              <p className="truncate text-sm text-slate-500">@{user.username}</p>
              <div className="mt-1.5">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Approved</dt>
              <dd className="font-mono text-xl text-emerald-200">{approved.length}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Pending</dt>
              <dd className="font-mono text-xl text-amber-200">{pending.length}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Rejected</dt>
              <dd className="font-mono text-xl text-rose-200">{rejected.length}</dd>
            </div>
          </dl>

          <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
            {demoMode ? (
              <>
                You are signed in with a <span className="text-amber-200">demo account</span>.
                With Discord connected, this card shows your real Discord identity
                and {ROLE_META[user.role].label.toLowerCase()} role.
              </>
            ) : (
              <>
                Signed in through Discord. Your avatar and Discord username come
                from your Discord account; everything else is stored by
                Schemonlist.
              </>
            )}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <DiscordIcon className="h-3.5 w-3.5 text-[#5865F2]" />
            Connected with Discord
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-bold text-white">Profile settings</h2>
          <p className="mb-4 mt-1 text-sm text-slate-400">
            Change how you appear on the list. Your role and points are managed
            by the moderation team.
          </p>
          <ProfileSettingsForm username={user.username} displayName={user.display_name} />
        </section>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">History</p>
            <h2 className="mt-1 text-2xl font-bold text-white">My submissions</h2>
          </div>
          <Link href="/submit" className="btn btn-primary btn-sm">New submission</Link>
        </div>

        {records.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            action={<Link href="/submit" className="btn btn-primary btn-sm">Submit your first record</Link>}
          >
            Beat a level on the list? Send in the video and it will show up here.
          </EmptyState>
        ) : (
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th>Level</th>
                    <th>Claim</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Submitted</th>
                    <th className="hidden lg:table-cell">Reviewer note</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        {record.level ? (
                          <Link
                            href={`/levels/${record.level.slug}`}
                            className="font-medium text-white hover:text-cyan-200"
                          >
                            {record.level.rank ? `#${record.level.rank} ` : ""}
                            {record.level.name}
                          </Link>
                        ) : (
                          <span className="text-slate-500">Unlisted level</span>
                        )}
                        <p className="mt-0.5 text-xs text-slate-500">
                          {record.progress}% ·{" "}
                          <a
                            href={record.video_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="link"
                          >
                            video
                          </a>
                        </p>
                      </td>
                      <td><KindBadge kind={record.kind} /></td>
                      <td><StatusBadge status={record.status} /></td>
                      <td className="hidden text-xs text-slate-400 sm:table-cell">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="hidden max-w-56 text-xs text-slate-400 lg:table-cell">
                        {record.reviewer_note ?? "—"}
                      </td>
                      <td className="text-right">
                        {record.status === "pending" ? (
                          <form action={deleteRecordAction}>
                            <input type="hidden" name="record_id" value={record.id} />
                            <input type="hidden" name="redirect_to" value="/profile" />
                            <ConfirmSubmit message="Delete this pending submission?">
                              Withdraw
                            </ConfirmSubmit>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
