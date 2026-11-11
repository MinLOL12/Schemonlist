import { levelPoints, computeLeaderboard } from "@/lib/points";
import type {
  DemonTier,
  Level,
  PublicProfile,
  RecordItem,
  RecordKind,
} from "@/lib/types";

export type DemoData = {
  levels: Level[];
  profiles: PublicProfile[];
  records: RecordItem[];
};

const NOW = Date.parse("2026-11-01T12:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

const VERIFIER: Record<string, string> = {
  acheron: "zoink",
  slaughterhouse: "toshdeluxe",
  "sakupen-circles": "skyy",
  tartarus: "dolphy",
  "silent-clubstep": "ranyx",
  "the-yandere": "golden",
  bloodlust: "knobbelboy",
  zodiac: "nwolc",
  "sonic-wave": "sunix",
  yatagarasu: "trusta",
  erebus: "ryamu",
  kenos: "npesta",
  cataclysm: "ggb0y",
  "artificial-ascent": "serponge",
  "plasma-pulse-finale": "zmx",
};

const LEVELS: Array<{
  slug: string;
  name: string;
  creators: string[];
  tier: DemonTier;
  description: string;
}> = [
  {
    slug: "acheron",
    name: "Acheron",
    creators: ["Ryamu", "Cursed"],
    tier: "extreme",
    description:
      "The current #1. A brutal extension of Sunset Sandstorm with some of the tightest timings ever verified. Every part is a run killer, and the last wave has ended more attempts than most players will ever make.",
  },
  {
    slug: "slaughterhouse",
    name: "Slaughterhouse",
    creators: ["IcEDCave"],
    tier: "extreme",
    description:
      "Skill-based, timing-heavy and famously long. One of the biggest verification projects of its era and still one of the most respected extremes on any list.",
  },
  {
    slug: "sakupen-circles",
    name: "Sakupen Circles",
    creators: ["Yunhasn't", "Nisha"],
    tier: "extreme",
    description:
      "Fast-paced extreme demon with a notorious pre-drop and a very unforgiving ending. Consistency is everything here.",
  },
  {
    slug: "tartarus",
    name: "Tartarus",
    creators: ["Dolphy", "Ferdefunky"],
    tier: "extreme",
    description:
      "A landmark extreme demon built around straight-fly and memory gameplay. The atmosphere alone has made it one of the most iconic levels in the game.",
  },
  {
    slug: "silent-clubstep",
    name: "Silent Clubstep",
    creators: ["Sailent"],
    tier: "extreme",
    description:
      "An infamous reboot of an impossible classic, rebuilt to be humanly possible — barely. Its straight-fly sections are legendary.",
  },
  {
    slug: "the-yandere",
    name: "The Yandere",
    creators: ["Renn241"],
    tier: "extreme",
    description:
      "Timing-heavy extreme demon with dense, punishing gameplay and a fast-paced finale that punishes any hesitation.",
  },
  {
    slug: "bloodlust",
    name: "Bloodlust",
    creators: ["Knobbelboy"],
    tier: "extreme",
    description:
      "A legendary extreme demon and one of the most watched verifications in GD history. Beautiful, brutal, and endlessly replayed.",
  },
  {
    slug: "zodiac",
    name: "Zodiac",
    creators: ["Bianox"],
    tier: "extreme",
    description:
      "Extremely consistent, extremely hard, and famous for demanding near-perfect play across a very long level.",
  },
  {
    slug: "sonic-wave",
    name: "Sonic Wave",
    creators: ["Sunix"],
    tier: "extreme",
    description:
      "The wave challenge that defined an entire generation of extreme demons. Old, iconic, and still brutal.",
  },
  {
    slug: "yatagarasu",
    name: "Yatagarasu",
    creators: ["TrusTa"],
    tier: "extreme",
    description:
      "A classic extreme demon with a punishing dual section and a long, tense ending that has broken countless runs.",
  },
  {
    slug: "erebus",
    name: "Erebus",
    creators: ["Rustam"],
    tier: "extreme",
    description:
      "Straight-fly heavy extreme demon with a fearsome final wave and a famously tight boss fight.",
  },
  {
    slug: "kenos",
    name: "Kenos",
    creators: ["Bianox", "Aurorus"],
    tier: "extreme",
    description:
      "Widely regarded as a top-tier extreme thanks to its precise, low-margin gameplay and relentless pacing.",
  },
  {
    slug: "cataclysm",
    name: "Cataclysm",
    creators: ["Ggb0y"],
    tier: "insane",
    description:
      "An old-school insane demon that is still considered one of the best levels ever made. Every part flows perfectly.",
  },
  {
    slug: "artificial-ascent",
    name: "Artificial Ascent",
    creators: ["Serponge"],
    tier: "insane",
    description:
      "A visually stunning insane demon with creative decoration and varied gameplay that still holds up today.",
  },
  {
    slug: "plasma-pulse-finale",
    name: "Plasma Pulse Finale",
    creators: ["Zmx"],
    tier: "insane",
    description:
      "The definitive Plasma Pulse level: fast, bright and relentlessly demanding from the first jump to the last.",
  },
];

const PEOPLE: Array<[username: string, display: string, role: "player" | "moderator" | "admin", days: number]> = [
  ["zoink", "Zoink", "player", 900],
  ["toshdeluxe", "ToshDeluxe", "moderator", 870],
  ["skyy", "Skyy", "player", 830],
  ["dolphy", "Dolphy", "player", 810],
  ["ranyx", "Ranyx", "player", 760],
  ["golden", "Golden", "player", 740],
  ["knobbelboy", "Knobbelboy", "player", 700],
  ["nwolc", "Nwolc", "player", 660],
  ["sunix", "Sunix", "player", 620],
  ["trusta", "TrusTa", "player", 590],
  ["ryamu", "Ryamu", "player", 560],
  ["npesta", "npesta", "player", 520],
  ["ggb0y", "Ggb0y", "player", 480],
  ["serponge", "Serponge", "player", 450],
  ["zmx", "Zmx", "player", 420],
  ["renn241", "Renn241", "player", 380],
  ["schemonistrator", "Schemonistrator", "admin", 1000],
];

/** Demo-only "completions" so the list, leaderboard and admin queue look alive. */
const COMPLETIONS: Array<[slug: string, username: string]> = [
  ["acheron", "npesta"],
  ["acheron", "toshdeluxe"],
  ["acheron", "golden"],
  ["slaughterhouse", "zoink"],
  ["slaughterhouse", "ranyx"],
  ["sakupen-circles", "golden"],
  ["sakupen-circles", "npesta"],
  ["tartarus", "trusta"],
  ["tartarus", "zoink"],
  ["silent-clubstep", "nwolc"],
  ["the-yandere", "renn241"],
  ["the-yandere", "skyy"],
  ["bloodlust", "zoink"],
  ["bloodlust", "dolphy"],
  ["zodiac", "golden"],
  ["sonic-wave", "npesta"],
  ["sonic-wave", "trusta"],
  ["sonic-wave", "ranyx"],
  ["yatagarasu", "ggb0y"],
  ["kenos", "nwolc"],
  ["kenos", "skyy"],
  ["cataclysm", "serponge"],
  ["cataclysm", "zoink"],
  ["artificial-ascent", "zmx"],
  ["plasma-pulse-finale", "renn241"],
  ["plasma-pulse-finale", "dolphy"],
];

const PENDING: Array<[slug: string, username: string, kind: RecordKind]> = [
  ["kenos", "npesta", "completion"],
  ["silent-clubstep", "golden", "verification"],
  ["cataclysm", "skyy", "completion"],
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function seedDemoData(): DemoData {
  const profiles: PublicProfile[] = PEOPLE.map(([username, display, role, days]) => ({
    id: `usr_${username}`,
    username,
    display_name: display,
    avatar_url: null,
    role,
    points: 0,
    is_banned: false,
    created_at: daysAgo(days),
  }));

  const byUsername = new Map(profiles.map((p) => [p.username, p]));

  const levels: Level[] = LEVELS.map((level, index) => {
    const rank = index + 1;
    const verifier = byUsername.get(VERIFIER[level.slug]);
    return {
      id: `lvl_${level.slug}`,
      slug: level.slug,
      name: level.name,
      creators: level.creators,
      publisher: level.creators[0] ?? null,
      gd_level_id: String(100_000 + index * 777),
      tier: level.tier,
      rank,
      points: levelPoints(rank),
      video_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${level.name} geometry dash verification`
      )}`,
      thumbnail_url: null,
      description: level.description,
      is_listed: true,
      verifier_id: verifier?.id ?? null,
      verifier: verifier ?? null,
      created_at: daysAgo(400 - index * 10),
      updated_at: daysAgo(30),
    };
  });

  const levelBySlug = new Map(levels.map((l) => [l.slug, l]));
  const records: RecordItem[] = [];
  let counter = 0;

  const push = (
    slug: string,
    username: string,
    kind: RecordKind,
    status: RecordItem["status"],
    days: number,
    note: string | null = null
  ) => {
    const level = levelBySlug.get(slug);
    const profile = byUsername.get(username);
    if (!level || !profile) return;
    counter += 1;
    records.push({
      id: `rec_${String(counter).padStart(3, "0")}`,
      level_id: level.id,
      user_id: profile.id,
      kind,
      progress: 100,
      video_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${level.name} ${kind} ${profile.username}`
      )}`,
      status,
      reviewer_note: note,
      reviewed_at: status === "pending" ? null : daysAgo(Math.max(days - 1, 0)),
      created_at: daysAgo(days),
      level,
      profile,
    });
  };

  for (const [slug, username] of Object.entries(VERIFIER)) {
    push(slug, username, "verification", "approved", 120 + (levelBySlug.get(slug)?.rank ?? 1) * 6);
  }
  for (const [slug, username] of COMPLETIONS) {
    push(slug, username, "completion", "approved", 20 + (levelBySlug.get(slug)?.rank ?? 1) * 4);
  }
  for (const [slug, username, kind] of PENDING) {
    push(slug, username, kind, "pending", 2);
  }

  // A rejected example so players (and admins) can see that state.
  push("acheron", "skyy", "completion", "rejected", 9, "Video does not show the full level from 0%.");

  const ranked = computeLeaderboard(profiles, records, levels);
  const pointsById = new Map(ranked.map((entry) => [entry.id, entry.points]));
  for (const profile of profiles) {
    profile.points = pointsById.get(profile.id) ?? 0;
  }

  return { levels, profiles, records };
}
