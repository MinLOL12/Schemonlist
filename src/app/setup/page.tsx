import Link from "next/link";

import { Notice } from "@/components/notice";
import { getSessionUser } from "@/lib/auth";
import { demoMode, supabaseConfigured } from "@/lib/config";
import { getSetupStatus } from "@/lib/data";

export const metadata = { title: "Setup status" };

function Check({
  ok,
  title,
  children,
}: {
  ok: boolean;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          ok
            ? "bg-emerald-400/15 text-emerald-300"
            : "bg-rose-400/15 text-rose-300"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {children ? <div className="mt-1 text-xs text-slate-400">{children}</div> : null}
      </div>
    </li>
  );
}

export default async function SetupPage() {
  const user = await getSessionUser();
  const status = await getSetupStatus(Boolean(user), user?.role === "admin");
  const allGood = status.configured && status.connected;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="eyebrow">Diagnostics</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Setup status</h1>
        <p className="mt-3 text-sm text-slate-400">
          A quick health check for the Supabase connection. The full walkthrough
          lives in <span className="text-cyan-300">docs/SUPABASE_SETUP.md</span>.
        </p>
      </div>

      {demoMode ? (
        <div className="mb-6">
          <Notice variant="warning" title="Running in demo mode">
            No Supabase credentials were found, so data is stored in memory and
            resets whenever the server restarts. Discord login is disabled. Follow
            the steps in <span className="font-semibold">docs/SUPABASE_SETUP.md</span>{" "}
            to connect a real project.
          </Notice>
        </div>
      ) : null}

      <div className="card p-6">
        <h2 className="text-lg font-bold text-white">Environment & database</h2>
        <ul className="mt-2">
          <Check ok={supabaseConfigured} title="NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set">
            Server-side environment variables are read at runtime. After editing{" "}
            <code className="text-slate-300">.env.local</code>, restart the dev
            server.
          </Check>
          <Check ok={status.connected} title="Database connection works">
            {status.error ? (
              <span className="text-rose-300">{status.error}</span>
            ) : status.connected ? (
              "The public API answered a query against public.levels."
            ) : (
              "Could not reach Supabase. Check the project URL and that the project is not paused."
            )}
          </Check>
          <Check ok={(status.levelCount ?? 0) > 0} title="Schema and levels exist">
            {status.levelCount == null
              ? "Not checked."
              : `${status.levelCount} listed level${status.levelCount === 1 ? "" : "s"} found.`}{" "}
            Run <code className="text-slate-300">supabase/schema.sql</code> then
            <code className="text-slate-300"> supabase/seed.sql</code> in the SQL editor.
          </Check>
          <Check ok={(status.adminCount ?? 0) > 0} title="An administrator exists">
            {status.adminCount == null
              ? "Not checked."
              : `${status.adminCount} admin account${status.adminCount === 1 ? "" : "s"}.`}{" "}
            Promote yourself with the SQL snippet below.
          </Check>
          <Check ok={status.signedIn} title="You are signed in">
            {status.signedIn
              ? `Signed in as @${user?.username} (${user?.role}).`
              : "Sign in with Discord to test the player and admin flows."}
          </Check>
        </ul>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-lg font-bold text-white">Promote your first admin</h2>
        <p className="mt-1 text-sm text-slate-400">
          Sign in once with Discord, then run this in the Supabase SQL editor.
          Role changes are blocked from the client on purpose.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 text-xs text-slate-300">
{`update public.profiles
set role = 'admin'
where username = 'your_discord_username';`}
        </pre>
        <p className="mt-3 text-xs text-slate-500">
          Afterwards, verify it worked: <code className="text-slate-400">select username, role from public.profiles;</code>
        </p>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-lg font-bold text-white">Next steps</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-400">
          <li>1. Enable the Discord provider in Supabase → Authentication → Providers.</li>
          <li>2. Add your deployment URL to the allowed redirect URLs.</li>
          <li>3. Run the schema SQL, then seed data, then promote an admin.</li>
          <li>4. Read docs/SECURITY.md before going live.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/list" className="btn btn-ghost btn-sm">View the list</Link>
          {status.signedIn ? (
            <Link href="/admin" className="btn btn-primary btn-sm">Open admin panel</Link>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">Sign in</Link>
          )}
        </div>
      </div>

      {allGood ? (
        <p className="mt-6 text-center text-xs text-emerald-300/80">
          Everything looks connected. You can deploy.
        </p>
      ) : null}
    </div>
  );
}
