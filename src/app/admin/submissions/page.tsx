import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { KindBadge, StatusBadge, TierBadge } from "@/components/badges";
import { EmptyState, Notice } from "@/components/notice";
import { ReviewForm } from "@/components/review-form";
import { getPendingRecords, getRecentReviewed } from "@/lib/data";
import { formatDate, timeAgo } from "@/lib/format";

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const [pending, reviewed, params] = await Promise.all([
    getPendingRecords(),
    getRecentReviewed(25),
    searchParams,
  ]);

  return (
    <div className="space-y-6">
      {params.message ? <Notice variant="success">{params.message}</Notice> : null}
      {params.error ? <Notice variant="error">{params.error}</Notice> : null}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Pending submissions</h2>
            <p className="text-sm text-slate-400">
              {pending.length} waiting for a decision.
            </p>
          </div>
        </div>

        {pending.length === 0 ? (
          <EmptyState title="Queue is empty">
            New submissions will appear here automatically.
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {pending.map((record) => (
              <li key={record.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={record.profile?.avatar_url}
                      name={record.profile?.username ?? "player"}
                      size={44}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {record.profile?.display_name ?? record.profile?.username ?? "Player"}
                      </p>
                      <p className="text-xs text-slate-500">
                        @{record.profile?.username} · submitted {timeAgo(record.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={record.kind} />
                    {record.level ? <TierBadge tier={record.level.tier} short /> : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_260px]">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-[10px] uppercase tracking-wider text-slate-500">Level</dt>
                        <dd className="mt-0.5">
                          {record.level ? (
                            <Link
                              href={`/levels/${record.level.slug}`}
                              className="font-medium text-slate-200 hover:text-cyan-200"
                            >
                              {record.level.rank ? `#${record.level.rank} ` : ""}
                              {record.level.name}
                            </Link>
                          ) : (
                            <span className="text-slate-500">Unlisted</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wider text-slate-500">Progress</dt>
                        <dd className="mt-0.5 font-mono text-slate-200 ">{record.progress}%</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[10px] uppercase tracking-wider text-slate-500">Video</dt>
                        <dd className="mt-0.5">
                          <a
                            href={record.video_url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="link break-all text-xs"
                          >
                            {record.video_url}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <ReviewForm recordId={record.id} redirectTo="/admin/submissions" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Recently reviewed</h2>
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th>Player</th>
                  <th>Level</th>
                  <th>Claim</th>
                  <th>Status</th>
                  <th className="hidden sm:table-cell">Reviewed</th>
                  <th className="hidden lg:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap text-sm text-slate-200">
                      {record.profile?.username ?? "—"}
                    </td>
                    <td className="text-sm text-slate-300">{record.level?.name ?? "—"}</td>
                    <td><KindBadge kind={record.kind} /></td>
                    <td><StatusBadge status={record.status} /></td>
                    <td className="hidden whitespace-nowrap text-xs text-slate-500 sm:table-cell">
                      {formatDate(record.reviewed_at)}
                    </td>
                    <td className="hidden max-w-64 truncate text-xs text-slate-500 lg:table-cell">
                      {record.reviewer_note ?? "—"}
                    </td>
                  </tr>
                ))}
                {reviewed.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No reviewed submissions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
