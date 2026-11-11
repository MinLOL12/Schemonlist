import Link from "next/link";

import { RankNumber, TierBadge } from "@/components/badges";
import type { Level } from "@/lib/types";

function VideoLink({ url }: { url: string | null }) {
  if (!url) return <span className="text-slate-600">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
      aria-label="Watch the verification video"
      title="Watch the verification video"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M8 5v14l11-7z" />
      </svg>
    </a>
  );
}

export function LevelTable({
  levels,
  showPoints = true,
  showVerifier = true,
}: {
  levels: Level[];
  showPoints?: boolean;
  showVerifier?: boolean;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="w-14 text-center">#</th>
              <th>Level</th>
              <th className="hidden sm:table-cell">Difficulty</th>
              {showVerifier ? <th className="hidden lg:table-cell">Verified by</th> : null}
              {showPoints ? <th className="hidden text-right sm:table-cell">Points</th> : null}
              <th className="w-10 text-center">
                <span className="sr-only">Video</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr key={level.id} className="group">
                <td className="text-center">
                  <RankNumber rank={level.rank} />
                </td>
                <td>
                  <Link
                    href={`/levels/${level.slug}`}
                    className="font-semibold text-white transition group-hover:text-cyan-200"
                  >
                    {level.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {level.creators.length > 0 ? level.creators.join(", ") : "Unknown creator"}
                  </p>
                </td>
                <td className="hidden sm:table-cell">
                  <TierBadge tier={level.tier} short />
                </td>
                {showVerifier ? (
                  <td className="hidden lg:table-cell">
                    {level.verifier ? (
                      <Link
                        href={`/players/${level.verifier.username}`}
                        className="text-sm text-slate-300 hover:text-cyan-200"
                      >
                        {level.verifier.display_name ?? level.verifier.username}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-600">Unverified</span>
                    )}
                  </td>
                ) : null}
                {showPoints ? (
                  <td className="hidden text-right sm:table-cell">
                    <span className="font-mono text-sm tabular-nums text-cyan-200">
                      {level.points}
                    </span>
                  </td>
                ) : null}
                <td className="text-center">
                  <VideoLink url={level.video_url} />
                </td>
              </tr>
            ))}
            {levels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                  No levels match your filters yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
