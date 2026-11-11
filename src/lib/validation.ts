import { TIER_ORDER } from "@/lib/points";
import type { DemonTier } from "@/lib/types";
import type { LevelInput } from "@/lib/mutations";

export const LIMITS = {
  name: 80,
  creator: 40,
  creators: 8,
  description: 2000,
  url: 500,
  note: 500,
  username: 24,
} as const;

export function isHttpUrl(value: string): boolean {
  if (value.length > LIMITS.url) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function text(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export type LevelValidation = {
  input?: LevelInput;
  errors: Record<string, string>;
};

export function validateLevelForm(formData: FormData, slugify: (s: string) => string): LevelValidation {
  const errors: Record<string, string> = {};

  const name = text(formData.get("name"), LIMITS.name);
  if (name.length < 2) errors.name = "Give the level a name (2-80 characters).";

  const slugRaw = text(formData.get("slug"), 80);
  const slug = slugify(slugRaw || name);
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) {
    errors.slug = "Slug may only contain lowercase letters, numbers and dashes.";
  }

  const creatorsRaw = text(formData.get("creators"), 400);
  const creators = creatorsRaw
    .split(",")
    .map((entry) => entry.trim().slice(0, LIMITS.creator))
    .filter(Boolean)
    .slice(0, LIMITS.creators);

  const publisher = text(formData.get("publisher"), LIMITS.creator) || null;
  const gdLevelId = text(formData.get("gd_level_id"), 24) || null;
  if (gdLevelId && !/^\d{1,20}$/.test(gdLevelId)) {
    errors.gd_level_id = "The GD level ID must be numeric.";
  }

  const tierRaw = text(formData.get("tier"), 16) as DemonTier;
  const tier: DemonTier = TIER_ORDER.includes(tierRaw) ? tierRaw : "extreme";

  const rankRaw = text(formData.get("rank"), 12);
  let rank: number | null = null;
  if (rankRaw !== "") {
    const parsed = Number(rankRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
      errors.rank = "Rank must be a whole number above 0 (or empty for unranked).";
    } else {
      rank = parsed;
    }
  }

  const videoUrl = text(formData.get("video_url"), LIMITS.url) || null;
  if (videoUrl && !isHttpUrl(videoUrl)) {
    errors.video_url = "Enter a full https:// link to the video.";
  }

  const thumbnailUrl = text(formData.get("thumbnail_url"), LIMITS.url) || null;
  if (thumbnailUrl && !isHttpUrl(thumbnailUrl)) {
    errors.thumbnail_url = "Enter a full https:// link to the image.";
  }

  const description = text(formData.get("description"), LIMITS.description) || null;
  const isListed = formData.get("is_listed") === "on" || formData.get("is_listed") === "true";

  const verifierRaw = text(formData.get("verifier_id"), 64);
  const verifierId =
    verifierRaw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verifierRaw)
      ? verifierRaw
      : null;
  if (verifierRaw && !verifierId && !verifierRaw.startsWith("usr_")) {
    errors.verifier_id = "Pick a verifier from the list.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    input: {
      name,
      slug,
      creators,
      publisher,
      gd_level_id: gdLevelId,
      tier,
      rank,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      description,
      is_listed: isListed,
      verifier_id: verifierId,
    },
  };
}
