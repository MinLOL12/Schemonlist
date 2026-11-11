# Schemonlist

A Geometry Dash **demonlist** with Discord accounts, player submissions and a
full staff panel. Players sign in with Discord, submit the levels they have
beaten or verified, and climb a points leaderboard. Admins add and edit levels,
review every claim and manage accounts.

Built with **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + Supabase**
(Postgres, Auth, Row Level Security).

---

## What you get

| Area | Features |
| --- | --- |
| Public list | Ranked demonlist with search + difficulty filter, per-level pages with verification videos, records and point values |
| Leaderboard | Ranked players with points, verification counts and public profiles |
| Accounts | Discord OAuth sign-in, automatic profile creation, editable username/display name, avatars from Discord |
| Player submissions | Submit a **completion** or **verification** with a video link and progress; one claim per level per kind; 10 submissions/hour rate limit |
| Admin panel | Dashboard, review queue (approve/reject with a note), full level CRUD, verifier assignment, rank/points management, account roles, ban/unban, audit log |
| Security | Row Level Security on every table, privilege-escalation triggers, admin-only SQL functions, immutable audit trail, PKCE OAuth, open-redirect protection |
| Developer UX | Demo mode with seeded data, `/setup` diagnostics page, automated schema/RLS test, ready-made CI workflow (`docs/github-actions-ci.yml`), four setup/security/deployment/admin guides |

---

## Quick start (see it in demo mode)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. With no Supabase credentials the app runs in
**demo mode**: a seeded list, an in-memory database and two one-click demo
accounts on the login page (player + admin). Nothing is persisted and demo mode
is disabled automatically in production builds.

Want the real thing? Follow **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**
— it walks through creating the Supabase project, the Discord application, the
SQL schema and your first admin in about 15 minutes.

```bash
cp .env.example .env.local   # then fill in the two Supabase values
```

---

## Documentation

| Document | What is inside |
| --- | --- |
| [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) | **Start here.** Supabase project, API keys, SQL schema, Discord OAuth, first admin, troubleshooting |
| [docs/SECURITY.md](docs/SECURITY.md) | RLS model, why the anon key is safe, service-role warnings, triggers, CSP, production checklist |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Vercel (or Docker/Node), environment variables, OAuth redirects, backups |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Day-to-day staff workflows: adding levels, reviewing records, bans |

---

## Project structure

```
src/
├─ app/
│  ├─ page.tsx                 Landing page (stats, top 10, activity)
│  ├─ list/                    Full demonlist with filters
│  ├─ levels/[slug]/           Level page + verification video + records
│  ├─ leaderboard/             Points leaderboard
│  ├─ players/[username]/      Public player profile
│  ├─ submit/                  Submit a completion / verification
│  ├─ profile/                 Account settings + my submissions
│  ├─ login/                   Discord sign-in (+ demo logins)
│  ├─ setup/                   Live diagnostics for the Supabase setup
│  ├─ admin/                   Staff area (overview, submissions, levels, users, audit)
│  ├─ auth/                    /auth/login → Discord, /auth/callback ← Discord
│  └─ globals.css              Tailwind 4 theme + design system
├─ actions/                    Server Actions (auth, records, levels, users)
├─ components/                 UI building blocks
└─ lib/
   ├─ config.ts                Env parsing + demo/live/setup-required modes
   ├─ supabase/server.ts       Request-scoped Supabase client (cookie based)
   ├─ auth.ts                  getSessionUser / requireUser / requireAdmin
   ├─ data.ts                  Every read query (demo + live branches)
   ├─ mutations.ts             Every write (demo + live branches)
   ├─ validation.ts            Shared input validation
   ├─ points.ts                Point curve, tier/status metadata
   └─ demo/                    Seeded in-memory dataset
supabase/
├─ schema.sql                  Tables, RLS, triggers, scoring, admin RPCs
└─ seed.sql                    15 starter levels
middleware.ts                  Session refresh + route protection
```

### Modes

| Mode | When | Behaviour |
| --- | --- | --- |
| **Demo** | No env vars, development | Seeded in-memory data, demo logins, everything works but resets |
| **Live** | Env vars present | Supabase + Discord, real persistence |
| **Setup required** | No env vars, production build | Replaces the app with a configuration screen (never serves fake data) |

---

## How points work

```
points(rank) = max(1, round(250 × e^(−0.09 × (rank − 1))))
```

Rank 1 is worth 250 points and the value decays with every position (rank 10 ≈
111, rank 25 ≈ 29). A player's total is the sum of the point value of each
**distinct** listed level they have an approved record on; a verification counts
as that level's completion, and approved records are what trigger a recalculation
(SQL function `recompute_points`). The same curve lives in
`src/lib/points.ts` for demo mode and in `supabase/schema.sql`
(`public.level_points`).

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm run test:schema` | Runs `schema.sql` + `seed.sql` in an embedded Postgres and asserts 37 RLS rules (no Docker needed) |

CI: copy `docs/github-actions-ci.yml` to `.github/workflows/ci.yml` to run
typecheck, the schema security tests and a production build on every push.

---

## Frequently asked questions

**Do I need to pay for Supabase?**
No. The free tier is more than enough for a demonlist: 500 MB database, 50k
monthly active users. See the free-tier notes in the setup guide.

**Can players log in with something other than Discord?**
Yes — enable another provider in Supabase → Authentication → Providers, then add
it to the `provider` list in `src/app/auth/login/route.ts`. The profile trigger
reads `preferred_username` / `full_name` / `avatar_url` from the provider's
metadata.

**How do I change the point curve?**
Edit `public.level_points()` in Postgres (and `src/lib/points.ts` for demo mode),
then re-save any level to refresh the generated points, or run
`select public.recompute_points(id) from public.profiles;`.

**Where do I change the look?**
`src/app/globals.css` holds the theme tokens (`--color-neon`, …) and component
classes (`.btn`, `.card`, `.pill`). Each page composes those.

**I only see fake players and levels.**
That is demo mode. Add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, restart the dev server, and the
app switches to live data.

---

Not affiliated with RobTop Games. Geometry Dash is a trademark of its owner.
