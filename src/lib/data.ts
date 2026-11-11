import "server-only";

import { demoMode, supabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { demoData } from "@/lib/demo/store";
import type {
  AdminUser,
  AuditEntry,
  DemonTier,
  LeaderboardEntry,
  Level,
  LevelOption,
  PublicProfile,
  RecordItem,
} from "@/lib/types";

// Shared column lists. They are explicit on purpose: `select *` would request
// columns the public API is not granted (e.g. profiles.ban_reason), and explicit
// lists keep payloads small.
const LEVEL_COLUMNS = `
  id, slug, name, creators, publisher, gd_level_id, tier, rank, points,
  video_url, thumbnail_url, description, is_listed, verifier_id,
  created_at, updated_at,
  verifier:profiles!levels_verifier_id_fkey(
    id, username, display_name, avatar_url, role, points, is_banned, created_at
  )
`;

const RECORD_COLUMNS = `
  id, level_id, user_id, kind, progress, video_url, status, reviewer_note,
  reviewed_at, created_at,
  level:levels(id, name, slug, rank, tier, points, is_listed),
  profile:profiles!records_user_id_fkey(
    id, username, display_name, avatar_url, role, points, is_banned, created_at
  )
`;

function warn(scope: string, error: unknown) {
  console.error(`[schemonlist] ${scope} failed:`, error);
}

function matchesQuery(level: Level, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    level.name.toLowerCase().includes(needle) ||
    (level.publisher ?? "").toLowerCase().includes(needle) ||
    level.creators.some((c) => c.toLowerCase().includes(needle)) ||
    (level.verifier?.username ?? "").toLowerCase().includes(needle)
  );
}

function sortRecords(records: RecordItem[]): RecordItem[] {
  return [...records].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "verification" ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export type LevelFilter = { q?: string; tier?: DemonTier | "all" };

export async function getListedLevels(filter: LevelFilter = {}): Promise<Level[]> {
  if (demoMode) {
    const { levels } = demoData();
    return levels
      .filter((l) => l.is_listed)
      .filter((l) => matchesQuery(l, filter.q ?? ""))
      .filter((l) => !filter.tier || filter.tier === "all" || l.tier === filter.tier)
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
  }

  const supabase = await createClient();
  let query = supabase
    .from("levels")
    .select(LEVEL_COLUMNS)
    .eq("is_listed", true)
    .order("rank", { ascending: true, nullsFirst: false });

  if (filter.tier && filter.tier !== "all") query = query.eq("tier", filter.tier);

  const { data, error } = await query;
  if (error) {
    warn("getListedLevels", error);
    return [];
  }
  const levels = (data ?? []) as unknown as Level[];
  return levels.filter((l) => matchesQuery(l, filter.q ?? ""));
}

export async function getLevelBySlug(slug: string): Promise<Level | null> {
  if (demoMode) {
    return demoData().levels.find((l) => l.slug === slug && l.is_listed) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select(LEVEL_COLUMNS)
    .eq("slug", slug)
    .eq("is_listed", true)
    .maybeSingle();
  if (error) {
    warn("getLevelBySlug", error);
    return null;
  }
  return (data as unknown as Level) ?? null;
}

/**
 * Same as getLevelBySlug but without the is_listed filter. RLS only returns
 * unlisted rows to staff, so this is safe to call for anybody.
 */
export async function getLevelBySlugForStaff(slug: string): Promise<Level | null> {
  if (demoMode) {
    return demoData().levels.find((l) => l.slug === slug) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select(LEVEL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    warn("getLevelBySlugForStaff", error);
    return null;
  }
  return (data as unknown as Level) ?? null;
}

export async function getLevelRecords(levelId: string): Promise<RecordItem[]> {
  if (demoMode) {
    return sortRecords(
      demoData().records.filter((r) => r.level_id === levelId && r.status === "approved")
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .select(RECORD_COLUMNS)
    .eq("level_id", levelId)
    .eq("status", "approved");
  if (error) {
    warn("getLevelRecords", error);
    return [];
  }
  return sortRecords((data ?? []) as unknown as RecordItem[]);
}

export async function getLevelOptions(): Promise<LevelOption[]> {
  const levels = await getListedLevels();
  return levels.map(({ id, slug, name, rank, tier, points }) => ({
    id,
    slug,
    name,
    rank,
    tier,
    points,
  }));
}

export type PublicStats = {
  levels: number;
  players: number;
  records: number;
};

export async function getPublicStats(): Promise<PublicStats> {
  if (demoMode) {
    const { levels, profiles, records } = demoData();
    return {
      levels: levels.filter((l) => l.is_listed).length,
      players: profiles.filter((p) => !p.is_banned).length,
      records: records.filter((r) => r.status === "approved").length,
    };
  }

  const supabase = await createClient();
  const [levels, players, records] = await Promise.all([
    supabase.from("levels").select("id", { count: "exact", head: true }).eq("is_listed", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("records").select("id", { count: "exact", head: true }).eq("status", "approved"),
  ]);

  return {
    levels: levels.count ?? 0,
    players: players.count ?? 0,
    records: records.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Players & leaderboard
// ---------------------------------------------------------------------------

export async function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  if (demoMode) {
    const { profiles, records, levels } = demoData();
    const { computeLeaderboard } = await import("@/lib/points");
    return computeLeaderboard(profiles, records, levels).slice(0, limit);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("id, username, display_name, avatar_url, role, points, records_count, verifications, created_at")
    .order("points", { ascending: false })
    .order("username", { ascending: true })
    .limit(limit);
  if (error) {
    warn("getLeaderboard", error);
    return [];
  }
  return (data ?? []) as unknown as LeaderboardEntry[];
}

export async function getPlayerByUsername(username: string): Promise<PublicProfile | null> {
  if (demoMode) {
    const { profiles } = demoData();
    return (
      profiles.find((p) => p.username.toLowerCase() === username.toLowerCase()) ?? null
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, points, is_banned, created_at")
    .ilike("username", username)
    .limit(5);
  if (error) {
    warn("getPlayerByUsername", error);
    return null;
  }
  const rows = (data ?? []) as unknown as PublicProfile[];
  return (
    rows.find((row) => row.username.toLowerCase() === username.toLowerCase()) ?? null
  );
}

export async function getPlayerRecords(userId: string): Promise<RecordItem[]> {
  if (demoMode) {
    return sortRecords(
      demoData().records.filter((r) => r.user_id === userId && r.status === "approved")
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .select(RECORD_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "approved");
  if (error) {
    warn("getPlayerRecords", error);
    return [];
  }
  return sortRecords((data ?? []) as unknown as RecordItem[]);
}

export async function getRecentRecords(limit = 8): Promise<RecordItem[]> {
  if (demoMode) {
    return demoData()
      .records.filter((r) => r.status === "approved")
      .sort(
        (a, b) =>
          new Date(b.reviewed_at ?? b.created_at).getTime() -
          new Date(a.reviewed_at ?? a.created_at).getTime()
      )
      .slice(0, limit);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .select(RECORD_COLUMNS)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(limit);
  if (error) {
    warn("getRecentRecords", error);
    return [];
  }
  return (data ?? []) as unknown as RecordItem[];
}

// ---------------------------------------------------------------------------
// A player's own submissions
// ---------------------------------------------------------------------------

export async function getMyRecords(userId: string): Promise<RecordItem[]> {
  if (demoMode) {
    return demoData()
      .records.filter((r) => r.user_id === userId)
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .select(RECORD_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    warn("getMyRecords", error);
    return [];
  }
  return (data ?? []) as unknown as RecordItem[];
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type AdminOverview = {
  levels: number;
  listedLevels: number;
  players: number;
  pending: number;
  approved: number;
  pendingRecords: RecordItem[];
  recentAudit: AuditEntry[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const empty: AdminOverview = {
    levels: 0,
    listedLevels: 0,
    players: 0,
    pending: 0,
    approved: 0,
    pendingRecords: [],
    recentAudit: [],
  };

  if (demoMode) {
    const { levels, profiles, records } = demoData();
    const pendingRecords = records
      .filter((r) => r.status === "pending")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      levels: levels.length,
      listedLevels: levels.filter((l) => l.is_listed).length,
      players: profiles.length,
      pending: pendingRecords.length,
      approved: records.filter((r) => r.status === "approved").length,
      pendingRecords: pendingRecords.slice(0, 5),
      recentAudit: [],
    };
  }

  const supabase = await createClient();
  const [levels, listed, players, pending, approved, pendingRecords, audit] =
    await Promise.all([
      supabase.from("levels").select("id", { count: "exact", head: true }),
      supabase
        .from("levels")
        .select("id", { count: "exact", head: true })
        .eq("is_listed", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("records")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("records")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("records")
        .select(RECORD_COLUMNS)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.rpc("admin_recent_audit", { limit_n: 6 }),
    ]);

  if (levels.error) warn("admin overview", levels.error);

  return {
    levels: levels.count ?? 0,
    listedLevels: listed.count ?? 0,
    players: players.count ?? 0,
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    pendingRecords: (pendingRecords.data ?? []) as unknown as RecordItem[],
    recentAudit: (audit.data ?? []) as unknown as AuditEntry[],
  };
}

export async function getPendingCount(): Promise<number> {
  if (demoMode) return demoData().records.filter((r) => r.status === "pending").length;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("records")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    warn("getPendingCount", error);
    return 0;
  }
  return count ?? 0;
}

export async function getPendingRecords(): Promise<RecordItem[]> {
  if (demoMode) {
    return demoData()
      .records.filter((r) => r.status === "pending")
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .select(RECORD_COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) {
    warn("getPendingRecords", error);
    return [];
  }
  return (data ?? []) as unknown as RecordItem[];
}

export async function getRecentReviewed(limit = 20): Promise<RecordItem[]> {
  if (demoMode) {
    return demoData()
      .records.filter((r) => r.status !== "pending")
      .sort(
        (a, b) =>
          new Date(b.reviewed_at ?? b.created_at).getTime() -
          new Date(a.reviewed_at ?? a.created_at).getTime()
      )
      .slice(0, limit);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("records")
    .select(RECORD_COLUMNS)
    .in("status", ["approved", "rejected"])
    .order("reviewed_at", { ascending: false })
    .limit(limit);
  if (error) {
    warn("getRecentReviewed", error);
    return [];
  }
  return (data ?? []) as unknown as RecordItem[];
}

export async function getAdminLevels(): Promise<Level[]> {
  if (demoMode) {
    const { levels } = demoData();
    return [...levels].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select(LEVEL_COLUMNS)
    .order("rank", { ascending: true, nullsFirst: false });
  if (error) {
    warn("getAdminLevels", error);
    return [];
  }
  return (data ?? []) as unknown as Level[];
}

export async function getAdminLevel(id: string): Promise<Level | null> {
  if (demoMode) return demoData().levels.find((l) => l.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select(LEVEL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    warn("getAdminLevel", error);
    return null;
  }
  return (data as unknown as Level) ?? null;
}

export async function getAdminUsers(q = ""): Promise<AdminUser[]> {
  if (demoMode) {
    const { profiles, records } = demoData();
    const needle = q.trim().toLowerCase();
    return profiles
      .filter(
        (p) =>
          !needle ||
          p.username.toLowerCase().includes(needle) ||
          (p.display_name ?? "").toLowerCase().includes(needle)
      )
      .map((p) => ({
        ...p,
        discord_username: p.username,
        is_banned: p.is_banned ?? false,
        ban_reason: null,
        records_count: records.filter((r) => r.user_id === p.id && r.status === "approved")
          .length,
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", { search: q || null });
  if (error) {
    warn("getAdminUsers", error);
    return [];
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    username: row.username as string,
    display_name: (row.display_name as string) ?? null,
    avatar_url: (row.avatar_url as string) ?? null,
    role: row.role as AdminUser["role"],
    points: (row.points as number) ?? 0,
    is_banned: Boolean(row.is_banned),
    ban_reason: (row.ban_reason as string) ?? null,
    discord_username: (row.discord_username as string) ?? null,
    created_at: row.created_at as string,
    records_count: Number(row.approved_records ?? 0),
  }));
}

export async function getAuditLog(limit = 60): Promise<AuditEntry[]> {
  if (demoMode) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_recent_audit", { limit_n: limit });
  if (error) {
    warn("getAuditLog", error);
    return [];
  }
  return (data ?? []) as unknown as AuditEntry[];
}

// ---------------------------------------------------------------------------
// Setup diagnostics (used by /setup)
// ---------------------------------------------------------------------------

export type SetupStatus = {
  configured: boolean;
  demoMode: boolean;
  connected: boolean;
  error: string | null;
  levelCount: number | null;
  adminCount: number | null;
  signedIn: boolean;
  isAdmin: boolean;
};

export async function getSetupStatus(signedIn: boolean, isAdmin: boolean): Promise<SetupStatus> {
  if (!supabaseConfigured) {
    return {
      configured: false,
      demoMode,
      connected: false,
      error: demoMode ? null : "Supabase environment variables are missing.",
      levelCount: null,
      adminCount: null,
      signedIn,
      isAdmin,
    };
  }
  const supabase = await createClient();
  const levels = await supabase
    .from("levels")
    .select("id", { count: "exact", head: true });
  const admins = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  return {
    configured: true,
    demoMode,
    connected: !levels.error,
    error: levels.error?.message ?? null,
    levelCount: levels.count ?? null,
    adminCount: admins.count ?? null,
    signedIn,
    isAdmin,
  };
}
