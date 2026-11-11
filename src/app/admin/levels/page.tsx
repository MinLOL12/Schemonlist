import Link from "next/link";

import { ConfirmSubmit } from "@/components/confirm-submit";
import { RankNumber, TierBadge } from "@/components/badges";
import { EmptyState, Notice } from "@/components/notice";
import { deleteLevelAction } from "@/actions/levels";
import { getAdminLevels } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLevelsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  await requireAdmin();
  const [levels, params] = await Promise.all([getAdminLevels(), searchParams]);

  return (
    <div className="space-y-5">
      {params.message ? <Notice variant="success">{params.message}</Notice> : null}
      {params.error ? <Notice variant="error">{params.error}</Notice> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Levels</h2>
          <p className="text-sm text-slate-400">
            {levels.length} level{levels.length === 1 ? "" : "s"} in the database ·{" "}
            {levels.filter((level) => level.is_listed).length} listed
          </p>
        </div>
        <Link href="/admin/levels/new" className="btn btn-primary btn-sm">
          + Add level
        </Link>
      </div>

      {levels.length === 0 ? (
        <EmptyState
          title="No levels yet"
          action={<Link href="/admin/levels/new" className="btn btn-primary btn-sm">Create the first level</Link>}
        >
          Add a level manually, or run <code className="text-slate-300">supabase/seed.sql</code>{" "}
          to load a starter list.
        </EmptyState>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="w-14 text-center">#</th>
                  <th>Level</th>
                  <th>Difficulty</th>
                  <th className="hidden md:table-cell">Verifier</th>
                  <th className="hidden text-right sm:table-cell">Points</th>
                  <th className="hidden text-center sm:table-cell">Listed</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level.id}>
                    <td className="text-center">
                      <RankNumber rank={level.rank} />
                    </td>
                    <td>
                      <p className="font-medium text-white">{level.name}</p>
                      <p className="text-xs text-slate-500">
                        /levels/{level.slug} · {level.creators.join(", ") || "no creators"}
                      </p>
                    </td>
                    <td><TierBadge tier={level.tier} short /></td>
                    <td className="hidden text-sm text-slate-300 md:table-cell">
                      {level.verifier?.username ?? "—"}
                    </td>
                    <td className="hidden text-right font-mono text-sm text-cyan-200 sm:table-cell">
                      {level.points}
                    </td>
                    <td className="hidden text-center sm:table-cell">
                      {level.is_listed ? (
                        <span className="text-xs font-semibold text-emerald-300">Listed</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">Hidden</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/levels/${level.id}`} className="btn btn-ghost btn-sm">
                          Edit
                        </Link>
                        <form action={deleteLevelAction}>
                          <input type="hidden" name="level_id" value={level.id} />
                          <ConfirmSubmit
                            message={`Delete “${level.name}”? Its records and points will be removed. This cannot be undone.`}
                          >
                            Delete
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
