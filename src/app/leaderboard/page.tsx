import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/badges";
import { EmptyState } from "@/components/notice";
import { getLeaderboard } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Leaderboard",
  description: "The best Geometry Dash players on Schemonlist, ranked by demonlist points.",
};

const PODIUM = [
  { ring: "from-amber-300 to-yellow-500", label: "1st", text: "text-amber-200" },
  { ring: "from-slate-200 to-slate-400", label: "2nd", text: "text-slate-200" },
  { ring: "from-orange-400 to-amber-600", label: "3rd", text: "text-orange-200" },
];

export default async function LeaderboardPage() {
  const [players, user] = await Promise.all([getLeaderboard(100), getSessionUser()]);
  const podium = players.slice(0, 3);

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">Players</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Leaderboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
          Points come from approved records. Each level counts once, and a
          verification counts as a completion of that level.
        </p>
      </div>

      {players.length === 0 ? (
        <EmptyState title="No ranked players yet">
          Once records are approved, players appear here.
        </EmptyState>
      ) : (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {podium.map((player, index) => (
              <Link
                key={player.id}
                href={`/players/${player.username}`}
                className={`card card-hover relative overflow-hidden p-5 ${
                  index === 0 ? "sm:-mt-2 border-amber-300/25" : ""
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${PODIUM[index].ring}`}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${PODIUM[index].text}`}>
                    {PODIUM[index].label}
                  </span>
                  <RoleBadge role={player.role} />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar src={player.avatar_url} name={player.username} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {player.display_name ?? player.username}
                    </p>
                    <p className="truncate text-xs text-slate-500">@{player.username}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Points</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums text-cyan-200">
                      {player.points}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {player.records_count} {player.records_count === 1 ? "record" : "records"}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="bg-white/[0.02]">
                    <th className="w-14 text-center">#</th>
                    <th>Player</th>
                    <th className="text-right">Points</th>
                    <th className="hidden text-right sm:table-cell">Verifications</th>
                    <th className="hidden text-right sm:table-cell">Records</th>
                    <th className="hidden text-right md:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => {
                      const position = index + 1;
                      const isMe = user?.id === player.id;
                      return (
                        <tr key={player.id} className={isMe ? "bg-cyan-400/[0.06]" : undefined}>
                          <td className="text-center font-mono text-sm tabular-nums text-slate-400">
                            {position}
                          </td>
                          <td>
                            <Link
                              href={`/players/${player.username}`}
                              className="flex items-center gap-3"
                            >
                              <Avatar src={player.avatar_url} name={player.username} size={30} />
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-white">
                                  {player.display_name ?? player.username}
                                  {isMe ? (
                                    <span className="ml-2 rounded bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                                      You
                                    </span>
                                  ) : null}
                                </span>
                                <span className="block truncate text-xs text-slate-500">
                                  @{player.username}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="text-right font-mono text-sm tabular-nums text-cyan-200">
                            {player.points}
                          </td>
                          <td className="hidden text-right text-sm tabular-nums text-slate-300 sm:table-cell">
                            {player.verifications}
                          </td>
                          <td className="hidden text-right text-sm tabular-nums text-slate-300 sm:table-cell">
                            {player.records_count}
                          </td>
                          <td className="hidden text-right text-xs text-slate-500 md:table-cell">
                            {formatDate(player.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Showing the top {players.length} players. Banned accounts are hidden
            from the leaderboard.
          </p>
        </>
      )}
    </div>
  );
}
