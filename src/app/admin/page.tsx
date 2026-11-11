import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { KindBadge, StatusBadge } from "@/components/badges";
import { EmptyState, Notice } from "@/components/notice";
import { ReviewForm } from "@/components/review-form";
import { Stat } from "@/components/stat";
import { getAdminOverview } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { formatNumber, timeAgo } from "@/lib/format";
import { demoMode } from "@/lib/config";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [overview, viewer, params] = await Promise.all([
    getAdminOverview(),
    getSessionUser(),
    searchParams,
  ]);
  const isAdmin = viewer?.role === "admin";

  return (
    <div className="space-y-6">
      {params.error === "forbidden" ? (
        <Notice variant="error" title="Administrator access required">
          That area is limited to administrators. Moderators can review
          submissions; levels, accounts and the audit log cannot be changed.
        </Notice>
      ) : null}

      {demoMode ? (
        <Notice variant="warning" title="Demo data">
          These numbers come from the in-memory demo dataset. Approvals, edits and
          bans work in this session but disappear on restart.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Listed levels" value={formatNumber(overview.listedLevels)} hint={`${overview.levels} total`} />
        <Stat label="Pending review" value={formatNumber(overview.pending)} accent="amber" hint="Needs a decision" />
        <Stat label="Players" value={formatNumber(overview.players)} accent="magenta" hint="Registered accounts" />
        <Stat label="Approved records" value={formatNumber(overview.approved)} accent="lime" hint="All time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Review queue</h2>
            <Link href="/admin/submissions" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
              Open queue →
            </Link>
          </div>

          {overview.pendingRecords.length === 0 ? (
            <EmptyState title="Nothing waiting">
              Every submission has been reviewed. Nice work.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {overview.pendingRecords.map((record) => (
                <li key={record.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        src={record.profile?.avatar_url}
                        name={record.profile?.username ?? "player"}
                        size={36}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {record.profile?.display_name ?? record.profile?.username ?? "Player"}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {record.level?.name ?? "Unknown level"} · {record.progress}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <KindBadge kind={record.kind} />
                      <span className="text-xs text-slate-500">
                        {timeAgo(record.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={record.video_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn btn-ghost btn-sm"
                    >
                      Watch video
                    </a>
                    <ReviewForm recordId={record.id} redirectTo="/admin" compact />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Quick actions
            </h2>
            <div className="mt-3 grid gap-2">
              {isAdmin ? (
                <>
                  <Link href="/admin/levels/new" className="btn btn-primary btn-sm">
                    Add a level
                  </Link>
                  <Link href="/admin/levels" className="btn btn-ghost btn-sm">
                    Manage levels
                  </Link>
                  <Link href="/admin/users" className="btn btn-ghost btn-sm">
                    Manage accounts
                  </Link>
                  <Link href="/admin/audit" className="btn btn-ghost btn-sm">
                    Audit log
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/admin/submissions" className="btn btn-primary btn-sm">
                    Open the review queue
                  </Link>
                  <p className="text-xs text-slate-500">
                    Moderators can review records. Levels, accounts and the audit
                    log are administrator-only.
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Recent moderation
            </h2>
            {overview.recentAudit.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Audit entries appear here once the database is connected — they
                are generated by triggers inside Postgres.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {overview.recentAudit.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3">
                    <span className="text-slate-300">
                      <span className="font-mono text-[10px] uppercase text-fuchsia-300">
                        {entry.action}
                      </span>
                      <br />
                      <span className="text-slate-500">{entry.entity}</span>
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {timeAgo(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Queue snapshot
            </h2>
            <div className="mt-3 flex items-center justify-between">
              <StatusBadge status="pending" />
              <span className="font-mono text-xl text-amber-200">{overview.pending}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Rejecting with a note is better than silently deleting — players see
              the reason on their profile.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
