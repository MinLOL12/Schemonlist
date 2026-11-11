import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { KindBadge, RankNumber, RoleBadge, TierBadge } from "@/components/badges";
import { EmptyState, Notice } from "@/components/notice";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboard, getPlayerByUsername, getPlayerRecords } from "@/lib/data";
import { formatDate } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPlayerByUsername(username);
  if (!profile) return { title: "Player not found" };
  return {
    title: `${profile.display_name ?? profile.username} (@${profile.username})`,
    description: `${profile.points} demonlist points on Schemonlist.`,
  };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPlayerByUsername(username);
  if (!profile) notFound();

  const [records, leaderboard, viewer] = await Promise.all([
    getPlayerRecords(profile.id),
    getLeaderboard(500),
    getSessionUser(),
  ]);

  const rankIndex = leaderboard.findIndex((entry) => entry.id === profile.id);
  const rank = rankIndex === -1 ? null : rankIndex + 1;
  const entry = leaderboard.find((row) => row.id === profile.id);
  const verifications = records.filter((r) => r.kind === "verification");
  const completions = records.filter((r) => r.kind === "completion");
  const isSelf = viewer?.id === profile.id;

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <Avatar src={profile.avatar_url} name={profile.username} size={88} className="glow-cyan" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {profile.display_name ?? profile.username}
              </h1>
              <RoleBadge role={profile.role} />
              {profile.is_banned ? (
                <span className="pill border-rose-400/40 bg-rose-500/10 text-rose-200">
                  Banned
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              @{profile.username} · joined {formatDate(profile.created_at)}
            </p>
            {isSelf ? (
              <Link href="/profile" className="mt-2 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                Manage your account →
              </Link>
            ) : null}
          </div>

          <div className="flex gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Rank</p>
              <p className="font-mono text-3xl font-semibold tabular-nums text-white">
                {rank ? `#${rank}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Points</p>
              <p className="font-mono text-3xl font-semibold tabular-nums text-cyan-200">
                {profile.points}
              </p>
            </div>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center sm:max-w-md sm:text-left">
          {[
            { label: "Records", value: records.length },
            { label: "Verifications", value: verifications.length },
            { label: "Completions", value: completions.length },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-0.5 font-mono text-xl font-semibold text-slate-100">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {profile.is_banned ? (
        <Notice variant="error" title="This account is banned">
          Banned accounts keep their public record history but cannot submit new
          records and are hidden from the leaderboard.
        </Notice>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Record history</p>
            <h2 className="mt-1 text-2xl font-bold text-white">Demonlist records</h2>
          </div>
          {entry ? (
            <p className="text-xs text-slate-500">
              {entry.records_count} approved · {entry.verifications} verified
            </p>
          ) : null}
        </div>

        {records.length === 0 ? (
          <EmptyState title="No approved records yet">
            {isSelf
              ? "Submit a run on any level and it will show up here once approved."
              : "This player has not had a record approved yet."}
          </EmptyState>
        ) : (
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="w-14 text-center">#</th>
                    <th>Level</th>
                    <th>Claim</th>
                    <th className="hidden sm:table-cell">Difficulty</th>
                    <th className="hidden text-right sm:table-cell">Approved</th>
                    <th className="w-16 text-center">Video</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="text-center">
                        <RankNumber rank={record.level?.rank ?? null} />
                      </td>
                      <td>
                        {record.level ? (
                          <Link
                            href={`/levels/${record.level.slug}`}
                            className="font-semibold text-white hover:text-cyan-200"
                          >
                            {record.level.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-500">Unlisted level</span>
                        )}
                      </td>
                      <td><KindBadge kind={record.kind} /></td>
                      <td className="hidden sm:table-cell">
                        {record.level ? <TierBadge tier={record.level.tier} short /> : null}
                      </td>
                      <td className="hidden text-right text-xs text-slate-400 sm:table-cell">
                        {formatDate(record.reviewed_at ?? record.created_at)}
                      </td>
                      <td className="text-center">
                        <a
                          href={record.video_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn btn-ghost btn-sm"
                        >
                          Watch
                        </a>
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
