// Shapes returned by the data layer. They intentionally mirror the database
// columns (snake_case) so there is exactly one representation to reason about.

export type Role = "player" | "moderator" | "admin";
export type RecordKind = "completion" | "verification";
export type RecordStatus = "pending" | "approved" | "rejected";
export type DemonTier = "easy" | "medium" | "hard" | "insane" | "extreme";

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  points: number;
  is_banned?: boolean;
  created_at: string;
};

export type Level = {
  id: string;
  slug: string;
  name: string;
  creators: string[];
  publisher: string | null;
  gd_level_id: string | null;
  tier: DemonTier;
  rank: number | null;
  points: number;
  video_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  is_listed: boolean;
  verifier_id: string | null;
  created_at: string;
  updated_at: string;
  verifier?: PublicProfile | null;
};

export type RecordItem = {
  id: string;
  level_id: string;
  user_id: string;
  kind: RecordKind;
  progress: number;
  video_url: string;
  status: RecordStatus;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  level?: Pick<
    Level,
    "id" | "name" | "slug" | "rank" | "tier" | "points" | "is_listed"
  > | null;
  profile?: PublicProfile | null;
};

export type LeaderboardEntry = PublicProfile & {
  records_count: number;
  verifications: number;
};

export type AdminUser = PublicProfile & {
  discord_username: string | null;
  is_banned: boolean;
  ban_reason: string | null;
  records_count: number;
};

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type SessionUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  is_banned: boolean;
};

export type ActionResult = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type LevelOption = {
  id: string;
  slug: string;
  name: string;
  rank: number | null;
  tier: DemonTier;
  points: number;
};
