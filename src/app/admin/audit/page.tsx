import { EmptyState, Notice } from "@/components/notice";
import { demoMode } from "@/lib/config";
import { getAuditLog } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export default async function AdminAuditPage() {
  await requireAdmin();
  const entries = await getAuditLog(100);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Audit log</h2>
        <p className="text-sm text-slate-400">
          Written by Postgres triggers on every level change and every role or ban
          update. Clients cannot insert entries.
        </p>
      </div>

      {demoMode ? (
        <Notice variant="warning" title="Audit log needs a live database">
          Demo mode keeps everything in memory, so there is nothing to audit. Once
          Supabase is connected, this page lists every administrative action with
          the actor, entity and a JSON snapshot.
        </Notice>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState title="No audit entries yet">
          Add a level or review a submission and it will show up here.
        </EmptyState>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th>When</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th className="hidden sm:table-cell">Actor</th>
                  <th className="hidden lg:table-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs text-slate-400">
                      {formatDate(entry.created_at)}
                    </td>
                    <td>
                      <span className="font-mono text-[11px] uppercase text-fuchsia-300">
                        {entry.action}
                      </span>
                    </td>
                    <td className="text-xs text-slate-300">
                      {entry.entity}
                      {entry.entity_id ? (
                        <span className="block font-mono text-[10px] text-slate-600">
                          {entry.entity_id.slice(0, 8)}…
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden font-mono text-[10px] text-slate-500 sm:table-cell">
                      {entry.actor_id ? `${entry.actor_id.slice(0, 8)}…` : "system"}
                    </td>
                    <td className="hidden max-w-md lg:table-cell">
                      <details>
                        <summary className="cursor-pointer text-xs text-cyan-300">
                          View snapshot
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/50 p-2 text-[10px] leading-relaxed text-slate-400">
{JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </details>
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
