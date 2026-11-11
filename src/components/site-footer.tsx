import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/30">
      <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="text-lg font-black tracking-tight text-white">
            SCHEMON<span className="text-gradient">LIST</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            A community Geometry Dash demonlist. Beat a level, verify a level,
            submit it, climb the board.
          </p>
          <p className="mt-3 text-xs text-slate-600">
            Not affiliated with RobTop Games. Geometry Dash is a trademark of its
            owner.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:gap-14">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Explore
            </p>
            <ul className="space-y-2 text-slate-400">
              <li><Link className="hover:text-cyan-200" href="/list">The List</Link></li>
              <li><Link className="hover:text-cyan-200" href="/leaderboard">Leaderboard</Link></li>
              <li><Link className="hover:text-cyan-200" href="/submit">Submit a record</Link></li>
              <li><Link className="hover:text-cyan-200" href="/login">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Setup
            </p>
            <ul className="space-y-2 text-slate-400">
              <li><Link className="hover:text-cyan-200" href="/setup">Setup status</Link></li>
              <li><span className="text-slate-500">Docs: docs/SUPABASE_SETUP.md</span></li>
              <li><span className="text-slate-500">Docs: docs/SECURITY.md</span></li>
              <li><span className="text-slate-500">Docs: docs/DEPLOYMENT.md</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-slate-600">
        Built with Next.js + Supabase · {new Date().getFullYear()}
      </div>
    </footer>
  );
}
