# Security model

Schemonlist assumes the browser is hostile. Anyone can read the JavaScript, grab
the public API key and call Supabase directly, bypassing the UI entirely. Every
rule therefore lives in the database, and the UI is only a convenience layer.

This document explains what is protected, how, and what you must still do
yourself before going live.

---

## Contents

1. [Threat model](#threat-model)
2. [The two Supabase keys](#the-two-supabase-keys)
3. [Authentication: Discord + PKCE](#authentication-discord--pkce)
4. [Row Level Security, table by table](#row-level-security-table-by-table)
5. [Why players cannot promote themselves](#why-players-cannot-promote-themselves)
6. [Admin operations go through RPCs](#admin-operations-go-through-rpcs)
7. [Abuse controls](#abuse-controls)
8. [Audit trail](#audit-trail)
9. [Application-layer protections](#application-layer-protections)
10. [HTTP security headers and CSP](#http-security-headers-and-csp)
11. [Verifying the policies](#verifying-the-policies)
12. [Production checklist](#production-checklist)
13. [Incident response](#incident-response)
14. [What is intentionally *not* built](#what-is-intentionally-not-built)

---

## Threat model

| Attacker | Goal | Mitigation |
| --- | --- | --- |
| Anonymous visitor | Read hidden data, write anything | RLS: only listed levels, approved records and public profile columns |
| Signed-in player | Approve their own record | Review columns and status changes are staff-only; trigger forces `pending` on insert |
| Signed-in player | Promote themselves to admin | Column grants + `profiles_guard` trigger + no insert/update path to `role` |
| Signed-in player | Boost their points or another player's | `points` is derived by trigger from approved records; players cannot write it |
| Banned player | Keep submitting / appear ranked | Ban flag checked in policy, insert trigger, and leaderboard view |
| Player | Forge audit entries or hide their tracks | `audit_log` has no client grants and no insert policy; triggers write it as owner |
| Attacker with a stolen session | Act as the victim | Short-lived JWT + refresh-token rotation (Supabase default), cookie `HttpOnly`/`SameSite=Lax` |
| Attacker | Phish via open redirect | `safeNext()` accepts only same-site relative paths; Supabase redirect allowlist |
| Attacker with the public API key | Bypass the UI | Expected: the key grants exactly the anonymous permission set |
| Attacker with the **secret** key | Everything | Never ship it; rotate immediately if exposed |

Out of scope: compromised Discord account, compromised Supabase account,
malicious database administrator, denial of service at the network layer.

---

## The two Supabase keys

| Key | Used where | Can it break security? |
| --- | --- | --- |
| Publishable / anon (`sb_publishable_…`) | Sent to every browser | No. It identifies the project; the JWT is what carries identity. RLS limits it to the anonymous role |
| Secret / service role (`sb_secret_…`) | Server-side scripts only, never this app | **Yes.** It bypasses RLS entirely |

Rules:

* The publishable key belongs in `NEXT_PUBLIC_SUPABASE_ANON_KEY` — it is public
  by design and appears in the client bundle.
* The secret key belongs in **no** `NEXT_PUBLIC_*` variable, no browser code, no
  git history. This project does not use it at all; admin actions work through
  the signed-in admin's own JWT.
* If you write a maintenance script that needs the secret key (for example a bulk
  import), run it locally with the key in your shell environment, never in the
  deployed app.

Supabase's `service_role` (legacy) and `sb_secret_…` (new) keys are equivalent in
power.

---

## Authentication: Discord + PKCE

1. `/auth/login` calls `supabase.auth.signInWithOAuth({ provider: 'discord' })`
   server-side. Supabase returns an authorisation URL containing a **PKCE code
   challenge**; the code verifier is stored in an `HttpOnly` cookie.
2. The browser goes to Discord, which redirects back to
   `https://<ref>.supabase.co/auth/v1/callback`.
3. Supabase verifies the OAuth exchange with the Discord client secret (which
   never leaves the server) and redirects to your registered
   `/auth/callback?code=…`.
4. `/auth/callback` calls `exchangeCodeForSession(code)`. The code is one-time
   and bound to the PKCE verifier cookie, so an intercepted URL is useless
   without the cookie.
5. `@supabase/ssr` writes the session as `HttpOnly`, `SameSite=Lax` cookies and
   `middleware.ts` refreshes them on each navigation.

Related protections:

* **Redirect allowlist** in Supabase → URL Configuration. Without it, Supabase
  refuses to send the user anywhere else.
* **Open-redirect guard** in `src/lib/url.ts`: the `next` parameter must be a
  relative path starting with a single `/`. `https://evil.example`,
  `//evil.example` and backslash tricks are rejected.
* **No passwords** are stored, hashed or reset by this app.
* **Only `identify email` scopes** are requested from Discord.

---

## Row Level Security, table by table

RLS is enabled on all four tables. Policies are defined in
`supabase/schema.sql`; grants add a second, independent layer.

### `profiles`

| Operation | Who | Rule |
| --- | --- | --- |
| `SELECT` | everyone | all rows, but only granted columns: `id, username, display_name, discord_username, avatar_url, role, points, is_banned, created_at, updated_at`. `ban_reason` is **not** granted |
| `UPDATE` | the row owner | only columns `username, display_name, avatar_url` are granted, so even a hand-crafted request cannot touch `role`, `points` or `is_banned` |
| `INSERT` / `DELETE` | nobody | created by the auth trigger, deleted by cascade or by an admin through SQL |
| Role / ban changes | admins | via `admin_set_role()` / `admin_set_ban()` |

`profiles_guard` (a `BEFORE UPDATE` trigger) is the belt to the column grant's
braces: it raises unless the caller is an admin, a banned-state change came from
the scoring function, or the protected columns are untouched.

### `levels`

| Operation | Who | Rule |
| --- | --- | --- |
| `SELECT` | everyone | `is_listed = true` |
| `SELECT` | admins/moderators | every row, including unlisted drafts |
| `INSERT`/`UPDATE`/`DELETE` | **admins only** | `is_admin()` |

Moderators can therefore review records but cannot restructure the list.

### `records`

| Operation | Who | Rule |
| --- | --- | --- |
| `SELECT` | everyone | `status = 'approved'` |
| `SELECT` | the submitter | their own rows in any status |
| `SELECT` | staff | everything |
| `INSERT` | signed-in players | `user_id = auth.uid()`, `status = 'pending'`, level is listed, account not banned. A trigger re-forces the owner, status and reviewer fields, and enforces the hourly limit |
| `UPDATE` | staff | any column; trigger stamps `reviewer_id`/`reviewed_at` |
| `DELETE` | owner (pending only) or staff | withdraw a claim or moderate |

A partial unique index (`level_id, user_id, kind WHERE status = 'approved'`)
makes duplicate approved claims impossible even if the UI is bypassed.

### `audit_log`

No grants, no policies. Only `SECURITY DEFINER` triggers (running as the table
owner) insert, and only `admin_recent_audit()` reads. A player cannot fabricate,
edit or delete history.

### `leaderboard` view

Created `WITH (security_invoker = true)`, so the view runs with the *caller's*
permissions and RLS applies to the underlying tables. It excludes banned
accounts.

---

## Why players cannot promote themselves

Four independent layers:

1. **No UI** exposes the field (defence against confusion, not attack).
2. **Column grant**: `authenticated` only has `UPDATE (username, display_name,
   avatar_url)`. `UPDATE profiles SET role='admin'` fails with a permission
   error before RLS is even considered.
3. **RLS**: the update policy only allows `id = auth.uid()`.
4. **Trigger**: `profiles_guard` raises `42501` if `role`, `points`, `is_banned`,
   `ban_reason`, `id` or `created_at` changed and the caller is not an admin.

The only path to a role change is `admin_set_role()`, a `SECURITY DEFINER`
function that starts with:

```sql
if not public.is_admin() then
  raise exception 'Admin access required.' using errcode = '42501';
end if;
```

…and refuses self-demotion to avoid admins locking themselves out.

---

## Admin operations go through RPCs

Admin RPCs run as the table owner (bypassing RLS/column grants) **after**
re-checking `is_admin()`. This is deliberate: it lets the app read `ban_reason`
and write `role` without granting those columns to the `authenticated` role,
which would otherwise be exploitable.

| Function | Guard | Notes |
| --- | --- | --- |
| `admin_list_users(search)` | `is_admin()` | returns up to 200 rows including ban reason |
| `admin_set_role(target, role)` | `is_admin()`, no self-change | audited by trigger |
| `admin_set_ban(target, banned, reason)` | `is_admin()`, no self-ban | banning rejects all pending submissions from that account |
| `admin_recent_audit(limit)` | `is_admin()` | capped at 200 rows |
| `recompute_points(uid)` | not callable by clients | `EXECUTE` revoked from `PUBLIC` |

Level CRUD is **not** an RPC: it uses the admin's own JWT against the table,
protected by RLS. That keeps the code simple and still lets Postgres enforce
everything.

---

## Abuse controls

* **Submission rate limit** — 10 records per hour per account, enforced in
  `records_guard`. Raising the limit is editing one number in SQL; the error
  message is surfaced to the player.
* **One claim per kind per level** — the unique partial index.
* **Duplicate pending claims** — rejected in `createRecord()` with a clear
  message.
* **Bans** — immediately block inserts and hide the account from the leaderboard,
  while preserving its history.
* **No arbitrary URLs in `href`** — every user-supplied link must pass
  `isHttpUrl()` (http/https only), so `javascript:` payloads never reach an
  anchor.
* **Server Actions** — Next.js checks the `Origin` header against `Host` for
  every action POST, which blocks cross-site form submissions.
* **Input length limits** — enforced in `src/lib/validation.ts` and by database
  `CHECK` constraints (name/slug lengths, progress 1–100, URL scheme).

What is *not* rate-limited: reads. Supabase applies its own API rate limits, and
a public demonlist is meant to be readable.

---

## Audit trail

Triggers write to `audit_log` on:

* every `INSERT` / `UPDATE` / `DELETE` on `levels`;
* every status change on `records`;
* every role or ban change on `profiles`.

Each row stores the actor (`auth.uid()`), action (`records.update`), entity, id
and a full JSON snapshot. Admins read it at `/admin/audit` or via
`select * from admin_recent_audit(50);`.

The log is append-only from the application's point of view. Retention is up to
you: prune with a scheduled job (`delete from audit_log where created_at < now() -
interval '1 year'`) if it grows large — do that as the database owner, not from
the app.

---

## Application-layer protections

| Area | Implementation |
| --- | --- |
| Session handling | `@supabase/ssr` cookie client, refreshed in `middleware.ts`; `getUser()` revalidates with Supabase instead of trusting a cookie |
| Route protection | `middleware.ts` redirects unauthenticated users away from `/submit`, `/profile`, `/admin`; every staff page **also** calls `requireStaff()` / `requireAdmin()` server-side, and every server action re-checks the role |
| Privileged actions | Every server action re-reads the session and the role — middleware alone is never trusted |
| Open redirects | `safeNext()` in `src/lib/url.ts` |
| Secrets | Only public keys in the bundle; nothing sensitive in `NEXT_PUBLIC_*` |
| Error messages | Database errors are mapped to friendly messages; unexpected details are logged server-side only |
| Demo mode | Only active when no credentials exist **and** `NODE_ENV !== 'production'`. A production build without credentials shows a configuration screen instead of accepting demo logins |
| No `dangerouslySetInnerHTML` | All user text is rendered as text by React |

---

## HTTP security headers and CSP

`next.config.ts` sets:

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

`X-Frame-Options` is intentionally **not** set so the app can be embedded in
previews. If you do not need that, add a Content-Security-Policy in
`next.config.ts`:

```ts
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    // Next.js injects inline bootstrap scripts; a nonce-based CSP needs a
    // custom middleware. This keeps the app working.
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.discordapp.com https://i.ytimg.com",
    "frame-src https://www.youtube-nocookie.com",
    "connect-src 'self' https://YOUR-PROJECT-REF.supabase.co wss://YOUR-PROJECT-REF.supabase.co",
    "font-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
}
```

Trade-offs to know before enabling it: `'unsafe-inline'` is required by Next's
bootstrap scripts unless you build a nonce pipeline (see the Next.js docs on
CSP); `frame-ancestors 'none'` prevents embedding; the YouTube and Discord CDN
origins are needed by the video player and avatars.

---

## Verifying the policies

### Automated: `npm run test:schema`

The repository ships a test that boots an embedded Postgres (PGlite, no Docker
or network needed), applies `supabase/schema.sql` + `seed.sql`, creates a
Supabase-compatible `auth` schema and then plays the role of an anonymous
visitor, a player and an admin. It asserts 37 behaviours — including "a player
cannot approve their own record", "a banned account disappears from the
leaderboard" and "the 11th submission in an hour is rejected". Run it after any
policy change; CI runs it too.

### Manual: SQL editor

Run these in the Supabase SQL editor. They simulate a signed-in player.

```sql
-- Make a fake JWT context for a real user id
select set_config('request.jwt.claims',
  json_build_object('sub', '<USER-UUID>', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. Own profile is visible, other rows are visible too (public data)
select username, role from public.profiles limit 3;

-- 2. Cannot escalate
update public.profiles set role = 'admin' where id = '<USER-UUID>';
-- ERROR: permission denied for table profiles  (or 42501 from the trigger)

-- 3. Cannot approve own record
update public.records set status = 'approved' where user_id = '<USER-UUID>';
-- ERROR: You are not allowed to edit this record.

-- 4. Cannot insert a level
insert into public.levels (slug, name) values ('x', 'x');
-- ERROR: new row violates row-level security policy

-- 5. Cannot read the audit log
select * from public.audit_log limit 1;
-- ERROR: permission denied for table audit_log

reset role;
```

If a statement unexpectedly succeeds, stop and re-run `supabase/schema.sql`
before letting anyone else use the site.

Additional useful checks:

```sql
-- Every table must have RLS
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';

-- Function ownership and security mode
select proname, prosecdef from pg_proc
where pronamespace = 'public'::regnamespace and proname like 'admin_%';
```

---

## Production checklist

Before you announce the site:

- [ ] `supabase/schema.sql` ran completely; all tables show **RLS enabled**
- [ ] Only listed levels appear in `/rest/v1/levels` for anonymous requests
- [ ] `audit_log` is unreadable for anonymous requests
- [ ] At least one admin exists; you have tested `/admin`
- [ ] Supabase redirect URLs contain **only** your real origins
- [ ] Discord redirect URL is exactly `https://<ref>.supabase.co/auth/v1/callback`
- [ ] `NEXT_PUBLIC_SITE_URL` is the https production origin
- [ ] `.env.local` / environment variables are not committed
- [ ] Email provider disabled if you want Discord-only sign-ups
- [ ] Rate limits enabled in Supabase (Auth → Rate Limits) — defaults are sane
- [ ] Captcha (Turnstile/hCaptcha) enabled if you expect abuse
- [ ] Database backups: free tier = daily with 7-day retention; paid tiers allow PITR
- [ ] You know how to rotate the publishable key and the Discord secret
- [ ] You have walked through [step 12 of the setup guide](SUPABASE_SETUP.md#12-verify-that-the-security-actually-works)

---

## Incident response

**A record was approved that shouldn't have been.** Reject it in
`/admin/submissions` (or SQL); points recalculate automatically. Check
`/admin/audit` for who approved it.

**An account needs to be stopped now.** `/admin/users` → **Ban**. Pending
submissions are rejected, the account disappears from the leaderboard and inserts
fail.

**The secret/service key leaked.** Rotate it in Project Settings → API
immediately; review `audit_log`, `auth.users` and `profiles` for changes you did
not make; redeploy if any server-side script used it.

**Stolen session suspected.** Sign the account out of all devices (Supabase →
Authentication → Users → user → sign out), or delete the user; their profile
cascades.

**Database corrupted by a bad bulk edit.** Restore a backup (Database → Backups)
or point-in-time recovery on paid plans. `audit_log` snapshots help reconstruct
individual rows.

---

## What is intentionally *not* built

* **No service-role usage in the app.** Every write uses the user's own token, so
  a compromised server cannot do more than an admin could.
* **No custom password storage.** Discord handles credentials.
* **No image uploads.** Avatars come from Discord, videos are links. Less attack
  surface, no bucket policies to get wrong.
* **No client-side authorisation decisions.** Hiding a button is cosmetic; the
  database decides.
