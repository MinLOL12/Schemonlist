import Link from "next/link";

export function SetupRequired() {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="card p-8">
        <p className="eyebrow">Configuration required</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          Schemonlist needs a database
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          This build is running in production without Supabase credentials, so
          demo mode is disabled on purpose. Add the two public environment
          variables below and redeploy.
        </p>

        <pre className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 text-xs text-slate-300">
{`NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com`}
        </pre>

        <p className="mt-5 text-sm text-slate-400">
          Full walkthrough:{" "}
          <span className="text-cyan-300">docs/SUPABASE_SETUP.md</span> in the
          repository. It covers creating the project, enabling Discord login,
          running the SQL schema and promoting your first admin.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/setup" className="btn btn-ghost btn-sm">
            Setup diagnostics
          </Link>
        </div>
      </div>
    </div>
  );
}
