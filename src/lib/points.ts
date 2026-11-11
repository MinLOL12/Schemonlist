import type { DemonTier, LeaderboardEntry, Level, PublicProfile, RecordItem } from "@/lib/types";

/**
 * Point value of a ranked level.
 * MUST stay in sync with public.level_points() in supabase/schema.sql.
 */
export function levelPoints(rank: number | null | undefined): number {
  if (!rank || rank < 1) return 0;
  return Math.max(1, Math.round(250 * Math.exp(-0.09 * (rank - 1))));
}

export const TIERS: Record<
  DemonTier,
  { label: string; short: string; badge: string; bar: string }
> = {
  extreme: {
    label: "Extreme Demon",
    short: "Extreme",
    badge: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200",
    bar: "from-fuchsia-500 to-rose-500",
  },
  insane: {
    label: "Insane Demon",
    short: "Insane",
    badge: "border-orange-400/40 bg-orange-500/15 text-orange-200",
    bar: "from-orange-500 to-amber-500",
  },
  hard: {
    label: "Hard Demon",
    short: "Hard",
    badge: "border-amber-400/40 bg-amber-400/15 text-amber-200",
    bar: "from-amber-400 to-yellow-500",
  },
  medium: {
    label: "Medium Demon",
    short: "Medium",
    badge: "border-lime-400/40 bg-lime-400/10 text-lime-200",
    bar: "from-lime-400 to-emerald-500",
  },
  easy: {
    label: "Easy Demon",
    short: "Easy",
    badge: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
    bar: "from-cyan-400 to-sky-500",
  },
};

export const TIER_ORDER: DemonTier[] = ["extreme", "insane", "hard", "medium", "easy"];

export const RECORD_STATUS_META = {
  pending: {
    label: "Pending",
    badge: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  },
  approved: {
    label: "Approved",
    badge: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  },
  rejected: {
    label: "Rejected",
    badge: "border-rose-400/40 bg-rose-400/10 text-rose-200",
  },
} as const;

export const ROLE_META = {
  player: { label: "Player", badge: "border-white/15 bg-white/5 text-slate-300" },
  moderator: {
    label: "Moderator",
    badge: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  },
  admin: {
    label: "Admin",
    badge: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200",
  },
} as const;

/**
 * Turns profiles + approved records into a sorted leaderboard.
 * Mirrors the SQL view + recompute_points() logic: points are counted once per
 * level, only for listed levels, preferring the verification claim.
 * Demo mode uses this; live mode reads the `leaderboard` view.
 */
export function computeLeaderboard(
  profiles: PublicProfile[],
  records: RecordItem[],
  levels: Level[]
): LeaderboardEntry[] {
  const levelById = new Map(levels.map((l) => [l.id, l]));
  const best = new Map<string, Map<string, { points: number; verification: boolean }>>();

  for (const record of records) {
    if (record.status !== "approved") continue;
    const level = levelById.get(record.level_id);
    if (!level || !level.is_listed || level.rank == null) continue;

    const perUser = best.get(record.user_id) ?? new Map();
    const current = perUser.get(level.id);
    const isVerification = record.kind === "verification";
    if (!current || (isVerification && !current.verification)) {
      perUser.set(level.id, { points: level.points, verification: isVerification });
    }
    best.set(record.user_id, perUser);
  }

  return profiles
    .filter((p) => !p.is_banned)
    .map((profile) => {
      const perUser = best.get(profile.id) ?? new Map();
      let points = 0;
      let verifications = 0;
      let records_count = 0;
      for (const entry of perUser.values()) {
        points += entry.points;
        records_count += 1;
        if (entry.verification) verifications += 1;
      }
      return { ...profile, points, records_count, verifications };
    })
    .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));
}
