# Supabase + Discord setup, from zero

This guide takes you from an empty Supabase account to a working, secured
Schemonlist with Discord login and your first administrator. It is written for
someone who has never used Supabase. Every click path, every value you need and
every check is here. Time: ~15 minutes.

If anything fails, jump to [Troubleshooting](#troubleshooting).

---

## Contents

1. [How the pieces fit together](#1-how-the-pieces-fit-together)
2. [Create the Supabase project](#2-create-the-supabase-project)
3. [Copy the API credentials](#3-copy-the-api-credentials)
4. [Create the database schema](#4-create-the-database-schema)
5. [Add the starter demonlist (optional)](#5-add-the-starter-demonlist-optional)
6. [Create the Discord application](#6-create-the-discord-application)
7. [Enable Discord in Supabase](#7-enable-discord-in-supabase)
8. [Configure redirect URLs](#8-configure-redirect-urls)
9. [Fill in `.env.local` and start the app](#9-fill-in-envlocal-and-start-the-app)
10. [Promote your first administrator](#10-promote-your-first-administrator)
11. [Test everything](#11-test-everything)
12. [Verify that the security actually works](#12-verify-that-the-security-actually-works)
13. [Using the Supabase CLI instead (optional)](#13-using-the-supabase-cli-instead-optional)
14. [Troubleshooting](#troubleshooting)
15. [Going further](#going-further)

---

## 1. How the pieces fit together

```
Browser ──► Schemonlist (Next.js) ──► Supabase Auth ──► Discord OAuth
                    │                      │
                    │                      └─ creates a row in auth.users,
                    │                         our trigger copies it to public.profiles
                    │
                    └──► Supabase REST (PostgREST) ──► Postgres
                              every query carries the user's JWT,
                              Row Level Security decides what is allowed
```

Three important consequences:

* **The browser never talks to Discord directly.** Supabase Auth owns the OAuth
  flow and gives us a session cookie. That is why the redirect URL you register
  at Discord is Supabase's callback, not our domain.
* **The app never uses a secret key.** It ships with the *publishable* (anon)
  key, which is safe because Row Level Security — not the key — decides what a
  request may do.
* **All privileged operations happen in Postgres.** Even the admin panel is
  constrained by RLS and by `SECURITY DEFINER` functions that re-check the
  caller.

---

## 2. Create the Supabase project

1. Go to <https://supabase.com> and sign in (GitHub login is fine).
2. Click **New project**.
3. Fill in:
   * **Name**: `schemonlist` (anything you like).
   * **Database password**: generate a long one and store it in your password
     manager. You rarely need it, but you cannot recover it — only reset it.
   * **Region**: the one closest to your players. This determines latency for
     every page.
   * **Plan**: Free is fine to start (see the notes at the end).
4. Click **Create new project** and wait ~2 minutes while the database is
   provisioned.

> **Free-tier projects pause after ~1 week of inactivity.** The first request
> after a pause takes a few seconds while it wakes up. If the site has real
> traffic this never happens; if you are just testing, open the dashboard now
> and then.

---

## 3. Copy the API credentials

In the Supabase dashboard for your project:

1. Open **Project Settings** (gear icon) → **API**.
2. You need two values:

   | Old dashboard label | New dashboard label | Environment variable | Secret? |
   | --- | --- | --- | --- |
   | Project URL | Project URL | `NEXT_PUBLIC_SUPABASE_URL` | no |
   | `anon` `public` key | **Publishable key** (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no |
   | `service_role` key | **Secret key** (`sb_secret_…`) | *not used by this app* | **YES** |

   The project URL looks like `https://abcdefghijklmnop.supabase.co`.

3. Copy the URL and the **publishable/anon** key. Ignore the secret key — this
   application never needs it, and putting it in a `NEXT_PUBLIC_*` variable
   would hand full database access to every visitor.

> **Why is the "public" key public?** It only identifies your project to
> PostgREST. Every request still carries a signed JWT, and every table has Row
> Level Security policies. With the public key alone you can read what anonymous
> visitors may read and nothing else. [docs/SECURITY.md](SECURITY.md) explains
> the model in depth.

---

## 4. Create the database schema

1. In the dashboard sidebar open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repository, copy the **entire** file and
   paste it into the editor.
3. Press **Run** (or `Ctrl/Cmd + Enter`).

The file is idempotent — running it twice will not destroy data. It creates:

| Object | Purpose |
| --- | --- |
| `profiles` | One row per Discord account: username, avatar, role, points, ban state |
| `levels` | The demonlist: rank, tier, creators, verifier, video, description |
| `records` | Player claims (completion/verification) with moderation status |
| `audit_log` | Append-only trail of level changes and role/ban changes |
| `leaderboard` view | Public points ranking |
| `level_points()`, `recompute_points()` | Scoring |
| `is_admin()`, `is_staff()` | Policy helpers |
| `admin_list_users()`, `admin_set_role()`, `admin_set_ban()`, `admin_recent_audit()` | Admin-only RPCs |
| Triggers | Profile creation on signup, points sync, privilege-escalation guard, rate limit, audit |
| RLS policies | Every read/write rule for players, visitors and staff |
| Column grants | Extra layer on top of RLS (players may edit only their own name/avatar) |

**Expected result:** a green `Success. No rows returned` message. If you instead
see `relation "profiles" already exists`, the file was already run — that is
fine.

### Confirm it worked

Open **Table Editor** in the sidebar. You should see `profiles`, `levels`,
`records` and `audit_log`. Next to each, the dashboard shows **RLS enabled**.

Then run this in the SQL editor:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

You should get roughly a dozen rows. If you get zero, the SQL was only partially
executed — clear the editor, paste the whole file again and run it in one go.

---

## 5. Add the starter demonlist (optional)

In the **SQL Editor**, open `supabase/seed.sql`, paste and run it. This inserts
15 ranked levels (Acheron, Slaughterhouse, Tartarus, …). Their video links point
at YouTube searches on purpose — replace them from the admin panel with real
verification videos.

Skip this if you want to start with an empty list and add levels yourself.

> **Optional but recommended:** `npm run test:schema` replays the schema in an
> embedded Postgres and checks 37 security rules locally in a few seconds.

---

## 6. Create the Discord application

Discord has to know that your Supabase project is allowed to ask users for their
identity.

1. Go to <https://discord.com/developers/applications> and sign in.
2. Click **New Application**, name it `Schemonlist` (this name is what users see
   on the consent screen), accept the terms, **Create**.
3. In the left sidebar open **OAuth2**.
4. Copy the **Client ID**.
5. Click **Reset Secret** → **Yes, do it!** and copy the **Client Secret**.
   Treat this like a password; it never goes in the frontend.
6. Still in **OAuth2**, find **Redirects** and click **Add Redirect**:

   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```

   Replace `YOUR-PROJECT-REF` with the subdomain from your project URL. This is
   Supabase's callback — **not** `localhost:3000/auth/callback`. Adding the wrong
   URL is the single most common setup mistake.
7. Click **Save Changes**.

> The app requests only the `identify` and `email` scopes. It never asks for
> `guilds`, `messages` or bot permissions, so the consent screen is minimal.

---

## 7. Enable Discord in Supabase

1. Supabase sidebar → **Authentication** → **Providers**.
2. Find **Discord**, toggle **Enable**.
3. Paste:
   * **Client ID** — from step 6.4
   * **Client Secret** — from step 6.5
4. Leave **Skip nonce check** off (default) unless Discord support tells you
   otherwise.
5. Click **Save**.

While you are in **Authentication → Providers**, consider:

* **Email**: disable it if the site should be Discord-only. This prevents
  password sign-ups from appearing in your user list. (Existing users keep
  working.)
* **Allow new users to sign up**: keep enabled — otherwise even Discord cannot
  create accounts.

---

## 8. Configure redirect URLs

Supabase must whitelist where the browser may be sent after login.

1. **Authentication** → **URL Configuration**.
2. **Site URL** — the canonical origin of your deployment:

   * Local development: `http://localhost:3000`
   * Production: `https://your-domain.com`

3. **Redirect URLs** — add every origin you will actually use. One per line:

   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   https://*.vercel.app/auth/callback
   ```

   The wildcard entry is optional; it is handy for Vercel preview deployments.
   Never add `https://*` — that would allow redirecting sessions to any site.

4. Click **Save**.

> **Why the wildcard is risky:** an open redirect entry lets an attacker send a
> victim through your auth flow and bounce the session token to their own
> domain. Keep the list explicit, delete preview URLs you no longer use.

---

## 9. Fill in `.env.local` and start the app

Create the file (it is git-ignored):

```bash
cp .env.example .env.local
```

Then edit it:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The amber **Demo mode** banner should be gone. If
it is still there, the env file is missing, misnamed (`.env` vs `.env.local`),
or the dev server was not restarted. Environment variables are read at startup.

You can also open <http://localhost:3000/setup> — a self-test page showing
whether the credentials, the database connection, the schema and the admin
account are all in place.

---

## 10. Promote your first administrator

Everyone signs in as a normal player. Admin rights are granted in SQL, on
purpose: no self-service path can create an administrator.

1. On your site, click **Sign in with Discord** and approve the consent screen.
2. If the login works you are redirected back and your profile exists. (The
   trigger created it from your Discord username.)
3. In Supabase → **SQL Editor**, run:

   ```sql
   select username, role from public.profiles order by created_at;
   ```

   Find your row. Then:

   ```sql
   update public.profiles
   set role = 'admin'
   where username = 'YOUR_USERNAME';   -- exact, case-sensitive
   ```

4. Reload the site. Your account menu now shows **Admin panel**, and
   `/admin` is available.

To make someone a moderator (can review records but not edit levels or
accounts), use `set role = 'moderator'` — or change it later from
**Admin → Accounts**.

---

## 11. Test everything

Do this once, in order, to be sure the whole chain works:

| Step | What to do | Expected |
| --- | --- | --- |
| 1 | Sign in with Discord | Redirect to Discord, consent, back on the site, avatar in the header |
| 2 | Visit `/profile` | Your username, "Connected with Discord", empty submission list |
| 3 | Go to `/admin/levels/new` | Form works; create a test level with rank 999 |
| 4 | Visit `/levels/<that-slug>` | Page renders, "Current #1" is untouched, rank 999 appears in `/list` |
| 5 | As a second Discord account, submit a completion on that level | Success message; record shows as **Pending** in `/profile` |
| 6 | As admin, open `/admin/submissions` | The submission is listed; approve it with a note |
| 7 | Check `/leaderboard` and the player's profile | Points increased, record is **Approved** |
| 8 | Open `/admin/audit` | Rows for the level insert and the record review |
| 9 | Ban the test account from `/admin/users` | It disappears from the leaderboard and cannot submit |
| 10 | Delete the test level from `/admin/levels` | Removed from `/list`; points recalculated |

If any step fails, the browser dev-tools console and the terminal running
`npm run dev` will contain the actual error.

---

## 12. Verify that the security actually works

These checks use `curl` with your **public** key — exactly what an attacker has.

```bash
export URL="https://YOUR-PROJECT-REF.supabase.co"
export KEY="YOUR_PUBLISHABLE_KEY"

# 1. Anonymous read of listed levels: allowed (200 + rows)
curl -s "$URL/rest/v1/levels?select=name&limit=3" -H "apikey: $KEY"

# 2. Anonymous read of audit_log: blocked (empty array, because there are no
#    grants and RLS has no policies for anon)
curl -s "$URL/rest/v1/audit_log?select=*" -H "apikey: $KEY"

# 3. Anonymous write to levels: blocked (401/403 or a policy error)
curl -s -X POST "$URL/rest/v1/levels" -H "apikey: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"slug":"hacked","name":"Hacked","tier":"extreme"}'

# 4. Reading profiles never returns the ban reason column:
curl -s "$URL/rest/v1/profiles?select=*&limit=1" -H "apikey: $KEY"
```

Expected: 1 returns data, 2 and 3 fail, and 4 fails with a column-permission
error (`permission denied for table profiles` / "column does not exist" style)
because `ban_reason` is not granted to anonymous clients. That is the correct,
intended behaviour — the app reads allowed columns explicitly.

> If check 1 returns `permission denied`, the schema's grants were not applied —
> re-run `supabase/schema.sql`.

More checks (as a signed-in player) are described in
[docs/SECURITY.md](SECURITY.md#verifying-the-policies).

---

## 13. Using the Supabase CLI instead (optional)

If you prefer to work locally with Docker:

```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase init
supabase start                    # downloads Postgres, Auth, Studio …
supabase db execute --file supabase/schema.sql
supabase db execute --file supabase/seed.sql
supabase status                   # prints local URL + anon key
```

Put the printed `API URL` and `anon key` in `.env.local`. Local Studio runs at
<http://localhost:54323>. Discord still needs a redirect entry for the local
callback:

```
http://127.0.0.1:54321/auth/v1/callback
```

When you are done, `supabase db push` can apply the schema to your hosted
project.

---

## Troubleshooting

### "redirect_uri_mismatch" on the Discord screen
The redirect URL registered in the Discord developer portal does not match
Supabase's callback. It must be exactly
`https://<project-ref>.supabase.co/auth/v1/callback` (no trailing slash, no
`/auth/v1/callback/` prefix from your own domain). Save it, then wait a minute
and retry.

### "Invalid redirect URL" / "Requested path is invalid" after login
The URL the app sent Supabase is not in **Authentication → URL Configuration →
Redirect URLs**. Add `http://localhost:3000/auth/callback` (and your production
equivalent). Note `NEXT_PUBLIC_SITE_URL` must match the origin you actually
visit.

### Login returns to `/login?error=…`
Read the message in the red box. `oauth_start` means Supabase rejected the
sign-in request — usually the Discord client ID/secret are wrong or the provider
is disabled. `missing_code` usually means the redirect URL is misconfigured.

### "Unsupported provider: provider is not enabled"
Authentication → Providers → Discord is not enabled, or you edited the wrong
project.

### Profile exists but the username is `player-abc123`
Your Discord account had no `preferred_username` in the metadata (rare). Rename
yourself in **My account**, or update the row in SQL.

### "new row violates row-level security policy for table records"
You are not signed in, the level is not listed, or your account is banned. Check
`/setup` and your profile page. This error is also what you see if the
`profiles` row is missing (schema not applied).

### `permission denied for table profiles`
You are selecting `ban_reason` (or `select *`) as a normal client. That column is
deliberately admin-only. Select explicit columns, or use the
`admin_list_users()` RPC as an admin.

### Every table appears empty in the app but data exists in Supabase
RLS is doing its job: the rows are not visible to the current role. Check
`is_listed` on levels, `status = 'approved'` on records, and that you are signed
in when you expect to see your own pending submissions.

### Everything works locally but not on Vercel
`NEXT_PUBLIC_*` variables are baked in at build time. Add them to the project's
environment variables, then **redeploy** (a rebuild, not just a restart). Also
add the production callback URL to both Supabase and Discord.
See [docs/DEPLOYMENT.md](DEPLOYMENT.md).

### Login works, but I am logged out after every click
Cookies are not being written. Make sure you access the site over `http://`
(localhost) or `https://` (production) — not mixed — and that no proxy strips
cookies. Behind a reverse proxy, `X-Forwarded-Proto` must be set so Next.js marks
cookies `Secure` correctly.

### I lost the database password
Project Settings → Database → **Reset database password**. Applications using
the API are unaffected.

### I leaked the publishable key
No action needed for security, but you can rotate it: Project Settings → API →
rotate the publishable key, update the env var, redeploy.

### I leaked the service role / secret key
Treat it as a full database compromise: rotate the key immediately in Project
Settings → API, check `audit_log` for unexpected changes, review
`auth.users` for unknown accounts, and read
[docs/SECURITY.md](SECURITY.md#incident-response).

---

## Going further

* **Custom domain for auth emails** — irrelevant here since Discord is the only
  provider, but useful if you enable e-mail sign-in later.
* **Storage** — avatars come from Discord's CDN, so no bucket is needed. If you
  later add level thumbnails uploaded by admins, create a `thumbnails` bucket,
  keep it public-read and restrict writes with a policy that checks
  `public.is_admin()`.
* **Realtime** — the review queue could subscribe to `records` changes; add
  `records` to the realtime publication and remember that RLS applies to
  realtime too.
* **Free-tier limits** — 500 MB database, 5 GB egress, 50k MAU. A demonlist with
  a few hundred levels uses a few megabytes.

---

Next: [SECURITY.md](SECURITY.md) → [DEPLOYMENT.md](DEPLOYMENT.md) →
[ADMIN_GUIDE.md](ADMIN_GUIDE.md)
