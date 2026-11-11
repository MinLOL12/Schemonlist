import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { RankNumber, TierBadge } from "@/components/badges";
import { Notice } from "@/components/notice";
import { VideoEmbed } from "@/components/video-embed";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getLevelBySlug, getLevelBySlugForStaff, getLevelRecords, getMyRecords } from "@/lib/data";
import { demoMode } from "@/lib/config";
import { formatDate } from "@/lib/format";
import type { RecordItem } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const level = await getLevelBySlug(slug);
  if (!level) return { title: "Level not found" };
  return {
    title: `#${level.rank ?? "?"} ${level.name}`,
    description:
      level.description ??
      `${level.name} by ${level.creators.join(", ")} — #${level.rank} on the Schemonlist demonlist.`,
  };
}

function RecordList({ records, empty }: { records: RecordItem[]; empty: string }) {
  if (records.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-white/[0.06]">
      {records.map((record) => (
        <li key={record.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <Avatar
            src={record.profile?.avatar_url}
            name={record.profile?.username ?? "player"}
            size={32}
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/players/${record.profile?.username ?? ""}`}
              className="truncate text-sm font-medium text-slate-200 hover:text-cyan-200"
            >
              {record.profile?.display_name ?? record.profile?.username ?? "Unknown player"}
            </Link>
            <p className="text-xs text-slate-500">
              {record.progress}% · {formatDate(record.reviewed_at ?? record.created_at)}
            </p>
          </div>
          <a
            href={record.video_url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-ghost btn-sm"
          >
            Watch
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function LevelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getSessionUser();
  // Staff can preview unlisted levels; everybody else gets a 404.
  const level =
    (await getLevelBySlug(slug)) ??
    (isStaff(viewer) ? await getLevelBySlugForStaff(slug) : null);
  if (!level) notFound();

  const [records, user] = await Promise.all([getLevelRecords(level.id), getSessionUser()]);
  const myRecords = user ? await getMyRecords(user.id) : [];
  const myPending = myRecords.filter(
    (record) => record.level_id === level.id && record.status === "pending"
  );

  const verifications = records.filter((r) => r.kind === "verification");
  const completions = records.filter((r) => r.kind === "completion");

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/list" className="hover:text-cyan-200">Demonlist</Link>
        <span>/</span>
        <span className="truncate text-slate-300">{level.name}</span>
      </nav>

      <header className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 font-mono text-[12rem] font-black leading-none text-white/[0.03]">
          {level.rank ?? "—"}
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2">
                <RankNumber rank={level.rank} />
              </span>
              <TierBadge tier={level.tier} />
              {!level.is_listed ? (
                <span className="pill border-amber-400/40 bg-amber-400/10 text-amber-200">
                  Unlisted
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {level.name}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Created by{" "}
              <span className="text-slate-200">
                {level.creators.length > 0 ? level.creators.join(", ") : "Unknown"}
              </span>
              {level.publisher ? (
                <>
                  {" "}· Published by <span className="text-slate-200">{level.publisher}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="relative flex gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Points</p>
              <p className="font-mono text-3xl font-semibold tabular-nums text-cyan-200">
                {level.points}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Records</p>
              <p className="font-mono text-3xl font-semibold tabular-nums text-white">
                {records.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-6">
          <VideoEmbed
            url={level.video_url}
            title={level.name}
            allowEmbed={!demoMode}
          />

          <section className="card p-6">
            <h2 className="text-lg font-bold text-white">About this level</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">
              {level.description ?? "No description has been added for this level yet."}
            </p>
          </section>

          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Records</h2>
              <span className="text-xs text-slate-500">
                {records.length} approved
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Verifications
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {verifications.length}
                  </span>
                </h3>
                <RecordList records={verifications} empty="No verification on file." />
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-300">
                  Completions
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {completions.length}
                  </span>
                </h3>
                <RecordList records={completions} empty="No completions approved yet." />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Level info
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Verifier</dt>
                <dd className="text-right">
                  {level.verifier ? (
                    <Link
                      href={`/players/${level.verifier.username}`}
                      className="inline-flex items-center gap-2 text-slate-200 hover:text-cyan-200"
                    >
                      <Avatar
                        src={level.verifier.avatar_url}
                        name={level.verifier.username}
                        size={22}
                      />
                      {level.verifier.display_name ?? level.verifier.username}
                    </Link>
                  ) : (
                    <span className="text-slate-500">Unknown</span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">GD level ID</dt>
                <dd className="font-mono text-slate-300">{level.gd_level_id ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Added</dt>
                <dd className="text-slate-300">{formatDate(level.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Difficulty</dt>
                <dd><TierBadge tier={level.tier} short /></dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2">
              {user ? (
                <Link
                  href={`/submit?level=${encodeURIComponent(level.slug)}`}
                  className="btn btn-primary w-full"
                >
                  Submit a record
                </Link>
              ) : (
                <Link href={`/auth/login?next=${encodeURIComponent(`/submit?level=${level.slug}`)}`} className="btn btn-primary w-full">
                  Sign in to submit
                </Link>
              )}
              {level.video_url ? (
                <a
                  href={level.video_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-ghost w-full"
                >
                  Watch verification
                </a>
              ) : null}
              {user?.role === "admin" ? (
                <Link href={`/admin/levels/${level.id}`} className="btn btn-ghost w-full">
                  Edit level
                </Link>
              ) : null}
            </div>
          </div>

          {myPending.length > 0 ? (
            <Notice variant="warning" title="Submission pending">
              You already have a pending {myPending[0].kind} for this level. A
              moderator will review it soon.
            </Notice>
          ) : null}

          <div className="card p-5 text-sm text-slate-400">
            <p className="font-semibold text-slate-200">Points</p>
            <p className="mt-1">
              An approved verification or completion of this level is worth{" "}
              <span className="font-mono text-cyan-200">{level.points}</span> points.
              Points count once per level.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
