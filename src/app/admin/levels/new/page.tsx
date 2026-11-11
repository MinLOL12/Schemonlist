import Link from "next/link";

import { LevelForm } from "@/components/level-form";
import { getAdminLevels, getAdminUsers } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "New level" };

export default async function NewLevelPage() {
  await requireAdmin();
  const [levels, users] = await Promise.all([getAdminLevels(), getAdminUsers()]);
  const highestRank = levels.reduce((max, level) => Math.max(max, level.rank ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/admin/levels" className="hover:text-cyan-200">Levels</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">New</span>
      </nav>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Add a level</h2>
        <p className="mt-1 text-sm text-slate-400">
          Points are derived from the rank: rank 1 is worth the most and the value
          decays with each position.
        </p>
      </div>

      <div className="card p-6 sm:p-8">
        <LevelForm users={users} nextRank={highestRank + 1} />
      </div>
    </div>
  );
}
