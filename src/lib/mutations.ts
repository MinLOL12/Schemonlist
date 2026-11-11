import "server-only";

import { demoMode } from "@/lib/config";
import { demoData, demoId, slugify } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/server";
import { computeLeaderboard, levelPoints } from "@/lib/points";
import type {
  DemonTier,
  RecordKind,
  RecordStatus,
  Role,
  SessionUser,
} from "@/lib/types";

export type MutationResult = { ok: true } | { ok: false; error: string };

const ok: MutationResult = { ok: true };
const fail = (error: string): MutationResult => ({ ok: false, error });

function friendlyDbError(error: { message?: string; code?: string } | null): string {
  const message = error?.message ?? "Something went wrong. Please try again.";
  if (/duplicate key/i.test(message) && /rank/i.test(message)) {
    return "That rank is already taken. Choose another rank or leave it empty.";
  }
  if (/duplicate key/i.test(message) && /slug/i.test(message)) {
    return "A level with that URL slug already exists.";
  }
  if (/duplicate key/i.test(message) && /username/i.test(message)) {
    return "That username is already taken.";
  }
  if (/row-level security/i.test(message)) {
    return "You do not have permission to do that.";
  }
  if (/Too many submissions/i.test(message)) return message;
  if (/banned/i.test(message)) return message;
  if (/profiles_username_format/i.test(message)) {
    return "Usernames must be 3-24 characters: letters, numbers, _ . or -";
  }
  if (/levels_rank_positive/i.test(message)) {
    return "Rank must be a positive number, or empty for unranked.";
  }
  if (/error saving new row|violates check constraint/i.test(message)) {
    return "That value is not allowed. Check the URLs and numeric fields.";
  }
  return message;
}

function recomputeDemoPoints() {
  const { profiles, records, levels } = demoData();
  const ranked = computeLeaderboard(profiles, records, levels);
  const pointsById = new Map(ranked.map((entry) => [entry.id, entry.points]));
  for (const profile of profiles) {
    profile.points = pointsById.get(profile.id) ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export type NewRecordInput = {
  level_id: string;
  kind: RecordKind;
  progress: number;
  video_url: string;
};

export async function createRecord(
  user: SessionUser,
  input: NewRecordInput
): Promise<MutationResult> {
  if (user.is_banned) return fail("Your account is banned and can no longer submit records.");

  if (demoMode) {
    const { levels, records, profiles } = demoData();
    const level = levels.find((l) => l.id === input.level_id);
    if (!level || !level.is_listed) return fail("That level is not on the list.");

    const duplicate = records.some(
      (r) =>
        r.level_id === input.level_id &&
        r.user_id === user.id &&
        r.kind === input.kind &&
        r.status === "approved"
    );
    if (duplicate) {
      return fail(
        `You already have an approved ${input.kind} for ${level.name}.`
      );
    }
    const pending = records.some(
      (r) =>
        r.level_id === input.level_id &&
        r.user_id === user.id &&
        r.kind === input.kind &&
        r.status === "pending"
    );
    if (pending) return fail("You already have a pending submission for this level.");

    const profile = profiles.find((p) => p.id === user.id);
    if (!profile) return fail("Your profile could not be found.");

    records.unshift({
      id: demoId("rec"),
      level_id: level.id,
      user_id: user.id,
      kind: input.kind,
      progress: input.progress,
      video_url: input.video_url,
      status: "pending",
      reviewer_note: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      level: {
        id: level.id,
        name: level.name,
        slug: level.slug,
        rank: level.rank,
        tier: level.tier,
        points: level.points,
        is_listed: level.is_listed,
      },
      profile,
    });
    return ok;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("records").insert({
    level_id: input.level_id,
    user_id: user.id,
    kind: input.kind,
    progress: input.progress,
    video_url: input.video_url,
    status: "pending",
  });
  if (error) return fail(friendlyDbError(error));
  return ok;
}

export async function reviewRecord(
  reviewer: SessionUser,
  recordId: string,
  status: Exclude<RecordStatus, "pending">,
  note: string | null
): Promise<MutationResult> {
  if (demoMode) {
    const record = demoData().records.find((r) => r.id === recordId);
    if (!record) return fail("That submission no longer exists.");
    record.status = status;
    record.reviewer_note = note;
    record.reviewed_at = new Date().toISOString();
    recomputeDemoPoints();
    return ok;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("records")
    .update({
      status,
      reviewer_note: note,
      reviewer_id: reviewer.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", recordId);
  if (error) return fail(friendlyDbError(error));
  return ok;
}

export async function deleteRecord(
  user: SessionUser,
  recordId: string
): Promise<MutationResult> {
  if (demoMode) {
    const { records } = demoData();
    const index = records.findIndex((r) => r.id === recordId);
    if (index === -1) return fail("That submission no longer exists.");
    const record = records[index];
    const isOwner = record.user_id === user.id && record.status === "pending";
    if (!isOwner && user.role !== "admin" && user.role !== "moderator") {
      return fail("You cannot delete this submission.");
    }
    records.splice(index, 1);
    recomputeDemoPoints();
    return ok;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("records").delete().eq("id", recordId);
  if (error) return fail(friendlyDbError(error));
  return ok;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export type LevelInput = {
  name: string;
  slug: string;
  creators: string[];
  publisher: string | null;
  gd_level_id: string | null;
  tier: DemonTier;
  rank: number | null;
  video_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  is_listed: boolean;
  verifier_id: string | null;
};

export async function saveLevel(
  input: LevelInput,
  levelId?: string
): Promise<MutationResult & { id?: string }> {
  if (demoMode) {
    const { levels, profiles } = demoData();
    const rankTaken = levels.some(
      (l) => l.rank === input.rank && l.rank !== null && l.id !== levelId
    );
    if (rankTaken) return fail("That rank is already taken. Choose another rank.");
    const slugTaken = levels.some((l) => l.slug === input.slug && l.id !== levelId);
    if (slugTaken) return fail("A level with that URL slug already exists.");

    const verifier = profiles.find((p) => p.id === input.verifier_id) ?? null;
    const now = new Date().toISOString();

    if (levelId) {
      const level = levels.find((l) => l.id === levelId);
      if (!level) return fail("That level no longer exists.");
      Object.assign(level, input, {
        points: levelPoints(input.rank),
        verifier,
        updated_at: now,
      });
    } else {
      const level = {
        id: demoId("lvl"),
        ...input,
        points: levelPoints(input.rank),
        verifier,
        created_at: now,
        updated_at: now,
      };
      levels.push(level);
      return { ok: true, id: level.id };
    }
    recomputeDemoPoints();
    return { ok: true, id: levelId };
  }

  const supabase = await createClient();
  if (levelId) {
    const { error } = await supabase.from("levels").update(input).eq("id", levelId);
    if (error) return fail(friendlyDbError(error));
    return { ok: true, id: levelId };
  }

  // `points` is filled by the levels_set_points trigger from the rank.
  const { data, error } = await supabase
    .from("levels")
    .insert(input)
    .select("id")
    .single();
  if (error) return fail(friendlyDbError(error));
  return { ok: true, id: data?.id as string };
}

export async function deleteLevel(levelId: string): Promise<MutationResult> {
  if (demoMode) {
    const { levels, records } = demoData();
    const index = levels.findIndex((l) => l.id === levelId);
    if (index === -1) return fail("That level no longer exists.");
    levels.splice(index, 1);
    for (let i = records.length - 1; i >= 0; i -= 1) {
      if (records[i].level_id === levelId) records.splice(i, 1);
    }
    recomputeDemoPoints();
    return ok;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("levels").delete().eq("id", levelId);
  if (error) return fail(friendlyDbError(error));
  return ok;
}

export function makeSlug(value: string): string {
  return slugify(value);
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function setUserRole(
  targetId: string,
  role: Role
): Promise<MutationResult> {
  if (demoMode) {
    const profile = demoData().profiles.find((p) => p.id === targetId);
    if (!profile) return fail("That account no longer exists.");
    profile.role = role;
    return ok;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", {
    target_id: targetId,
    new_role: role,
  });
  if (error) return fail(friendlyDbError(error));
  return ok;
}

export async function setUserBan(
  targetId: string,
  banned: boolean,
  reason: string | null
): Promise<MutationResult> {
  if (demoMode) {
    const { profiles, records } = demoData();
    const profile = profiles.find((p) => p.id === targetId);
    if (!profile) return fail("That account no longer exists.");
    profile.is_banned = banned;
    if (banned) {
      for (const record of records) {
        if (record.user_id === targetId && record.status === "pending") {
          record.status = "rejected";
          record.reviewer_note = reason ? `Account banned: ${reason}` : "Account banned";
          record.reviewed_at = new Date().toISOString();
        }
      }
    }
    recomputeDemoPoints();
    return ok;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_ban", {
    target_id: targetId,
    banned,
    reason,
  });
  if (error) return fail(friendlyDbError(error));
  return ok;
}

export async function updateOwnProfile(
  userId: string,
  username: string,
  displayName: string | null
): Promise<MutationResult> {
  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) {
    return fail("Usernames must be 3-24 characters: letters, numbers, _ . or -");
  }
  if (demoMode) {
    const { profiles } = demoData();
    const taken = profiles.some(
      (p) => p.username.toLowerCase() === username.toLowerCase() && p.id !== userId
    );
    if (taken) return fail("That username is already taken.");
    const profile = profiles.find((p) => p.id === userId);
    if (!profile) return fail("Your profile could not be found.");
    profile.username = username;
    profile.display_name = displayName;
    return ok;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username, display_name: displayName })
    .eq("id", userId);
  if (error) return fail(friendlyDbError(error));
  return ok;
}
