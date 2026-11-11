import { RECORD_STATUS_META, ROLE_META, TIERS } from "@/lib/points";
import type { DemonTier, RecordStatus, Role } from "@/lib/types";

export function TierBadge({ tier, short = false }: { tier: DemonTier; short?: boolean }) {
  const meta = TIERS[tier];
  return (
    <span className={`pill ${meta.badge}`}>
      {short ? meta.short : meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: RecordStatus }) {
  const meta = RECORD_STATUS_META[status];
  return <span className={`pill ${meta.badge}`}>{meta.label}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  return <span className={`pill ${meta.badge}`}>{meta.label}</span>;
}

export function KindBadge({ kind }: { kind: "completion" | "verification" }) {
  return kind === "verification" ? (
    <span className="pill border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
      Verification
    </span>
  ) : (
    <span className="pill border-violet-400/30 bg-violet-400/10 text-violet-200">
      Completion
    </span>
  );
}

export function RankNumber({ rank }: { rank: number | null }) {
  if (rank == null) {
    return <span className="font-mono text-sm text-slate-500">—</span>;
  }
  const medal =
    rank === 1
      ? "text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.55)]"
      : rank === 2
        ? "text-slate-200 drop-shadow-[0_0_10px_rgba(226,232,240,0.35)]"
        : rank === 3
          ? "text-orange-300/90"
          : "text-slate-400";
  return (
    <span className={`font-mono text-base font-semibold tabular-nums ${medal}`}>
      {rank}
    </span>
  );
}
