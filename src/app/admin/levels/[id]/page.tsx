import Link from "next/link";
import { notFound } from "next/navigation";

import { LevelForm } from "@/components/level-form";
import { Notice } from "@/components/notice";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteLevelAction } from "@/actions/levels";
import { getAdminLevel, getAdminUsers } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Edit level" };

export default async function EditLevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [level, users] = await Promise.all([getAdminLevel(id), getAdminUsers()]);
  if (!level) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/levels" className="hover:text-cyan-200">Levels</Link>
        <span>/</span>
        <span className="truncate text-slate-300">{level.name}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Edit level</h2>
          <p className="mt-1 text-sm text-slate-400">
            Public page:{" "}
            <Link href={`/levels/${level.slug}`} className="link">
              /levels/{level.slug}
            </Link>
          </p>
        </div>
        <form action={deleteLevelAction}>
          <input type="hidden" name="level_id" value={level.id} />
          <ConfirmSubmit
            message={`Delete “${level.name}”? Records and points will be removed.`}
          >
            Delete level
          </ConfirmSubmit>
        </form>
      </div>

      {query.message ? (
        <div className="mb-4"><Notice variant="success">{query.message}</Notice></div>
      ) : null}
      {query.error ? (
        <div className="mb-4"><Notice variant="error">{query.error}</Notice></div>
      ) : null}

      <div className="card p-6 sm:p-8">
        <LevelForm level={level} users={users} />
      </div>
    </div>
  );
}
