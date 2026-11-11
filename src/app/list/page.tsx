import Link from "next/link";

import { LevelTable } from "@/components/level-table";
import { EmptyState } from "@/components/notice";
import { getListedLevels } from "@/lib/data";
import { TIERS, TIER_ORDER } from "@/lib/points";
import type { DemonTier } from "@/lib/types";

export const metadata = {
  title: "The Demonlist",
  description: "Every ranked Geometry Dash demon on Schemonlist, with creators, verifiers and points.",
};

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 64);
  const requestedTier = params.tier;
  const tier: DemonTier | "all" =
    requestedTier && TIER_ORDER.includes(requestedTier as DemonTier)
      ? (requestedTier as DemonTier)
      : "all";

  const levels = await getListedLevels({ q, tier });
  const totalPoints = levels.reduce((sum, level) => sum + level.points, 0);

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">The list</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Demonlist
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
          Every level below has been verified by a player and approved by the
          moderation team. Point values fall off with rank — the hardest levels
          are worth the most.
        </p>
      </div>

      <form className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="q" className="label">Search</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Level, creator or verifier…"
            className="input"
            maxLength={64}
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="tier" className="label">Difficulty</label>
          <select id="tier" name="tier" defaultValue={tier} className="input">
            <option value="all">All difficulties</option>
            {TIER_ORDER.map((value) => (
              <option key={value} value={value}>
                {TIERS[value].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">Filter</button>
          <Link href="/list" className="btn btn-ghost">Reset</Link>
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <p>
          Showing <span className="font-semibold text-slate-200">{levels.length}</span>{" "}
          {levels.length === 1 ? "level" : "levels"}
          {q ? <> matching “<span className="text-slate-200">{q}</span>”</> : null}
          {tier !== "all" ? <> · {TIERS[tier].label}</> : null}
        </p>
        <p>
          Total points on page:{" "}
          <span className="font-mono text-cyan-200">{totalPoints.toLocaleString("en-US")}</span>
        </p>
      </div>

      {levels.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          action={<Link href="/list" className="btn btn-ghost btn-sm">Clear filters</Link>}
        >
          No levels match those filters. Try a different search term or difficulty.
        </EmptyState>
      ) : (
        <LevelTable levels={levels} />
      )}
    </div>
  );
}
