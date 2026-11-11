import Link from "next/link";
import { redirect } from "next/navigation";

import { DiscordIcon } from "@/components/avatar";
import { Notice } from "@/components/notice";
import { demoSignIn } from "@/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { demoMode, supabaseConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo/store";
import { safeNext } from "@/lib/url";
import { safeDecode } from "@/lib/format";

export const metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Supabase is not configured yet. Visit the setup page to connect a project.",
  oauth_start: "Discord sign-in could not be started. Check the Discord provider settings in Supabase.",
  missing_code: "Discord did not return an authorisation code. Please try again.",
  unknown_persona: "That demo account does not exist.",
  forbidden: "That area is restricted to administrators.",
  access_denied: "You cancelled the Discord authorisation.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next, "/");
  const user = await getSessionUser();
  if (user) redirect(next);

  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? safeDecode(params.error))
    : null;

  const demoProfiles = demoMode
    ? demoData().profiles.filter((p) => p.id === "usr_zoink" || p.id === "usr_schemonistrator")
    : [];

  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
      <div>
        <p className="eyebrow">Sign in</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          One click.
          <br />
          No passwords.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
          Schemonlist uses Discord to create your player profile. We only ask for
          your Discord ID, username and avatar — never your messages, servers or
          email marketing consent.
        </p>

        <ul className="mt-6 space-y-3 text-sm text-slate-400">
          {[
            "Your Discord name and avatar become your profile",
            "Submit completions and verifications in seconds",
            "Keep track of pending, approved and rejected records",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] text-cyan-200">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-white">Continue with Discord</h2>
        <p className="mt-1 text-sm text-slate-400">
          You will be redirected to Discord and back. By signing in you agree to
          the submission rules.
        </p>

        {errorMessage ? (
          <div className="mt-4">
            <Notice variant="error">{errorMessage}</Notice>
          </div>
        ) : null}
        {!supabaseConfigured && !demoMode ? (
          <div className="mt-4">
            <Notice variant="warning" title="Database not configured">
              Add your Supabase credentials to enable Discord login. See{" "}
              <Link href="/setup" className="link">setup status</Link>.
            </Notice>
          </div>
        ) : null}

        <a
          href={`/auth/login?next=${encodeURIComponent(next)}`}
          className="btn mt-5 w-full bg-[#5865F2] text-white hover:bg-[#4752c4] focus-visible:ring-[#5865F2]/50"
        >
          <DiscordIcon className="h-5 w-5" />
          Log in with Discord
        </a>

        {demoMode ? (
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
              Demo mode
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Supabase is not connected. Pick a temporary account to explore the
              site — no Discord required.
            </p>
            <div className="mt-3 grid gap-2">
              {demoProfiles.map((profile) => (
                <form key={profile.id} action={demoSignIn}>
                  <input type="hidden" name="persona" value={profile.id} />
                  <input type="hidden" name="next" value={next} />
                  <button type="submit" className="btn btn-ghost w-full justify-between">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold uppercase">
                        {profile.username.slice(0, 2)}
                      </span>
                      {profile.display_name ?? profile.username}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      {profile.role}
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
