import Link from "next/link";

import { Avatar, DiscordIcon } from "@/components/avatar";
import { KindBadge, RankNumber, TierBadge } from "@/components/badges";
import { LevelTable } from "@/components/level-table";
import { SectionHeader } from "@/components/stat";
import { getSessionUser } from "@/lib/auth";
import {
  getLeaderboard,
  getListedLevels,
  getPublicStats,
  getRecentRecords,
} from "@/lib/data";
import { formatNumber, timeAgo } from "@/lib/format";

export default async function HomePage() {
  const [levels, stats, recent, leaderboard, user] = await Promise.all([
    getListedLevels(),
    getPublicStats(),
    getRecentRecords(6),
    getLeaderboard(5),
    getSessionUser(),
  ]);

  const top = levels.slice(0, 10);
  const featured = levels[0] ?? null;
  const topPlayers = leaderboard.slice(0, 5);

  return (
    <div className="space-y-20">
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10">
        <div
          className="pointer-events-none absolute inset-0 bg-[url('/hero-art.jpg')] bg-cover bg-center opacity-80"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void via-void/90 to-void/40"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/40"
          aria-hidden
        />
        <div className="relative grid items-center gap-12 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-rise">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
                </span>
                Live demonlist
              </span>
              <span className="chip">{formatNumber(stats.levels)} ranked levels</span>
              <span className="chip">{formatNumber(stats.players)} players</span>
            </div>

            <h1 className="mt-6 text-[2.7rem] font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              The hardest
              <br />
              <span className="text-gradient">Geometry&nbsp;Dash</span>
              <br />
              levels, ranked.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Every level on this list is verified by a real player. Submit your
              completions, prove your verifications, and earn points that put you
              on the leaderboard.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/list" className="btn btn-primary">
                Browse the list
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              {user ? (
                <Link href="/submit" className="btn btn-ghost">
                  Submit a record
                </Link>
              ) : (
                <Link href="/auth/login" className="btn btn-ghost">
                  <DiscordIcon />
                  Join with Discord
                </Link>
              )}
              <Link href="/leaderboard" className="btn btn-ghost">
                Leaderboard
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[
                { label: "Levels", value: formatNumber(stats.levels) },
                { label: "Players", value: formatNumber(stats.players) },
                { label: "Verified records", value: formatNumber(stats.records) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </dt>
                  <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Featured #1 */}
          {featured ? (
            <div className="relative animate-rise">
              <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-transparent to-fuchsia-500/20 blur-2xl" />
              <div className="rounded-3xl bg-gradient-to-br from-cyan-400/40 via-white/10 to-fuchsia-400/40 p-px">
                <div className="notch relative overflow-hidden rounded-3xl bg-[#070a14] p-6 sm:p-8">
                  <span className="pointer-events-none absolute -right-6 -top-10 font-mono text-[11rem] font-black leading-none text-white/[0.04]">
                    {featured.rank ?? "—"}
                  </span>

                  <div className="flex items-center justify-between gap-3">
                    <span className="pill border-amber-300/40 bg-amber-300/10 text-amber-200">
                      Current #1
                    </span>
                    <TierBadge tier={featured.tier} />
                  </div>

                  <h2 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
                    <Link href={`/levels/${featured.slug}`} className="hover:text-cyan-200">
                      {featured.name}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    by {featured.creators.join(", ") || "Unknown"}
                  </p>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Verifier
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Avatar
                          src={featured.verifier?.avatar_url}
                          name={featured.verifier?.username ?? "unknown"}
                          size={26}
                        />
                        <span className="truncate text-sm font-medium text-slate-200">
                          {featured.verifier?.display_name ?? featured.verifier?.username ?? "Unverified"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Points
                      </p>
                      <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-cyan-200">
                        {featured.points}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Link href={`/levels/${featured.slug}`} className="btn btn-primary flex-1">
                      View level
                    </Link>
                    {featured.video_url ? (
                      <a
                        href={featured.video_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn btn-ghost"
                        aria-label="Watch verification"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Top 10 ---------------------------------------------------------- */}
      <section>
        <SectionHeader
          eyebrow="The list"
          title="Top 10 hardest levels"
          description="Ranked by difficulty. Only levels verified by a player make the list."
          action={
            <Link href="/list" className="btn btn-ghost btn-sm">
              View all {levels.length > 0 ? `${levels.length} levels` : "levels"} →
            </Link>
          }
        />
        <LevelTable levels={top} />
      </section>

      {/* Activity + leaderboard ------------------------------------------ */}
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="card p-5 sm:p-6">
          <SectionHeader
            eyebrow="Activity"
            title="Recently verified records"
            action={
              <Link href="/leaderboard" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                Leaderboard →
              </Link>
            }
          />
          <ul className="divide-y divide-white/[0.06]">
            {recent.map((record) => (
              <li key={record.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar
                  src={record.profile?.avatar_url}
                  name={record.profile?.username ?? "player"}
                  size={34}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <Link
                      href={`/players/${record.profile?.username ?? ""}`}
                      className="font-semibold text-white hover:text-cyan-200"
                    >
                      {record.profile?.display_name ?? record.profile?.username ?? "A player"}
                    </Link>{" "}
                    <span className="text-slate-400">
                      {record.kind === "verification" ? "verified" : "beat"}
                    </span>{" "}
                    {record.level ? (
                      <Link
                        href={`/levels/${record.level.slug}`}
                        className="font-semibold text-cyan-200 hover:underline"
                      >
                        {record.level.name}
                      </Link>
                    ) : (
                      <span className="text-slate-300">a level</span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <KindBadge kind={record.kind} />
                    <span>{timeAgo(record.reviewed_at ?? record.created_at)}</span>
                  </p>
                </div>
                {record.level?.rank ? (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Rank</p>
                    <RankNumber rank={record.level.rank} />
                  </div>
                ) : null}
              </li>
            ))}
            {recent.length === 0 ? (
              <li className="py-8 text-center text-sm text-slate-500">
                No approved records yet.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="card flex flex-col p-5 sm:p-6">
          <SectionHeader
            eyebrow="Players"
            title="Top 5"
            action={
              <Link href="/leaderboard" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                All →
              </Link>
            }
          />
          <ol className="flex-1 space-y-2">
            {topPlayers.map((player, index) => (
              <li key={player.id}>
                <Link
                  href={`/players/${player.username}`}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <span className="w-5 text-center font-mono text-xs text-slate-500">
                    {index + 1}
                  </span>
                  <Avatar src={player.avatar_url} name={player.username} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
                    {player.display_name ?? player.username}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-cyan-200">
                    {player.points}
                  </span>
                </Link>
              </li>
            ))}
            {topPlayers.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-500">
                No players ranked yet.
              </li>
            ) : null}
          </ol>
          <Link href="/leaderboard" className="btn btn-ghost mt-4 w-full btn-sm">
            Full leaderboard
          </Link>
        </div>
      </section>

      {/* How it works ----------------------------------------------------- */}
      <section>
        <SectionHeader
          eyebrow="How it works"
          title="From first completion to the front page"
          description="Three steps. Discord login, a video link, and a moderator looking at it."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Sign in with Discord",
              body: "One click, no passwords. Your Discord name and avatar become your player profile. Change your display name any time.",
            },
            {
              step: "02",
              title: "Submit a completion or verification",
              body: "Pick the level, attach the video of the run, and send it in. Verifications earn the level's full points, completions count too.",
            },
            {
              step: "03",
              title: "Get approved, climb the board",
              body: "Moderators review every claim. Approved records award points once per level and appear on your public profile.",
            },
          ].map((item) => (
            <div key={item.step} className="card card-hover relative overflow-hidden p-6">
              <span className="font-mono text-xs font-bold text-cyan-300/70">{item.step}</span>
              <h3 className="mt-3 text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA -------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/10 px-6 py-12 text-center sm:px-12">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <p className="eyebrow">Your turn</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Think you can climb the list?
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            {user
              ? "You are signed in. Pick a level you have beaten and send in the video."
              : "Create a player profile in one click with Discord, then submit your best runs."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={user ? "/submit" : "/auth/login"} className="btn btn-primary">
              {user ? (
                "Submit a record"
              ) : (
                <>
                  <DiscordIcon /> Sign in with Discord
                </>
              )}
            </Link>
            <Link href="/list" className="btn btn-ghost">See the full list</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
