# Deployment

The app is a standard Next.js 15 application with server-side rendering,
Server Actions and middleware. Any host that runs Node 18+ works. Vercel is the
path of least resistance.

---

## 1. Deploy to Vercel

### 1.1 Push the repository

```bash
git add .
git commit -m "Schemonlist"
git push origin main
```

### 1.2 Import the project

1. Go to <https://vercel.com/new>.
2. **Import Git Repository** → pick your repo.
3. Framework preset: **Next.js** (auto-detected). Leave build/install commands
   untouched (`npm install`, `next build`).
4. Expand **Environment Variables** and add, for **Production, Preview and
   Development**:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your publishable/anon key |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` (use the Vercel URL for the first deploy and update it after adding a domain) |

5. **Deploy**.

> `NEXT_PUBLIC_*` values are inlined at build time. If you change one later you
> must trigger a **new deployment** — editing the variable alone does nothing to
> the already-built bundle.

### 1.3 Add the deployment URL to Supabase

Supabase → **Authentication** → **URL Configuration**:

* **Site URL**: `https://your-project.vercel.app` (or your domain)
* **Redirect URLs**: add `https://your-project.vercel.app/auth/callback`

Then update `NEXT_PUBLIC_SITE_URL` in Vercel to the same origin and redeploy.

The Discord developer portal does **not** need changes: Discord only ever sees
`https://<ref>.supabase.co/auth/v1/callback`.

### 1.4 Custom domain

1. Vercel → Project → **Settings** → **Domains** → add `your-domain.com`.
2. Follow the DNS instructions.
3. Add `https://your-domain.com/auth/callback` to Supabase → Redirect URLs and
   set it as the Site URL.
4. Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` and redeploy.

### 1.5 Preview deployments

Every branch gets a `*.vercel.app` URL. For login to work there you can add an
explicit preview URL to Supabase, or the wildcard entry
`https://*.vercel.app/auth/callback`. The wildcard is convenient but broad —
remove it if you only deploy from `main`. Also note that preview builds use the
preview environment variables, so `NEXT_PUBLIC_SITE_URL` should stay the
production origin unless you set a preview-specific value.

---

## 2. Self-hosting (Docker / any VPS)

```bash
npm ci
npm run build
PORT=3000 npm start
```

The server needs:

* Node 18.18+ (Node 20/22 recommended)
* Outbound HTTPS to `*.supabase.co`
* A reverse proxy terminating TLS (Caddy, nginx, Traefik)

Minimal nginx config:

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;
  }
}
```

Why the headers matter:

* `X-Forwarded-Proto: https` makes Next.js mark auth cookies `Secure`.
* `Host` keeps Server Action origin checks working. If the proxy rewrites the
  host to `127.0.0.1`, Server Actions fail with a 500 — keep the original Host.
* Do **not** buffer or strip cookies.

A `Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

Pass environment variables at runtime (or bake them in at build time — remember
the `NEXT_PUBLIC_*` rule).

---

## 3. Post-deploy smoke test

Run through this on the deployed URL, not locally:

1. `/` loads with your real levels (banner must not say "Demo mode").
2. **Sign in with Discord** → consent → back on `/profile` with your avatar.
3. `/setup` shows green checks for connection, schema, admin and session.
4. `/admin/levels/new` creates a level; it appears on `/list`.
5. A second Discord account submits a record; admin approves it; points appear
   on `/leaderboard`.
6. Sign out, then try to open `/admin` directly — you should be redirected to
   `/login`.
7. Run the anonymous `curl` checks from
   [SUPABASE_SETUP.md §12](SUPABASE_SETUP.md#12-verify-that-the-security-actually-works)
   against the production Supabase project.

---

## 4. Operations

### Backups

Supabase free tier includes daily backups with 7 days of retention; paid plans
add point-in-time recovery. Before a large bulk edit (renumbering ranks, mass
deletions) take a manual backup from **Database → Backups**, or export:

```bash
pg_dump "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
  --schema=public --no-owner > schemonlist-backup.sql
```

### Monitoring

* Vercel → **Logs** for runtime errors (search for `[schemonlist]`).
* Supabase → **Reports** for API errors and slow queries.
* `/setup` is a quick manual health check you can open at any time.

### Scaling notes

* The demo dataset is irrelevant in production: all reads are indexed
  (`levels_rank_idx`, `records_status_idx`, `records_user_idx`).
* `getAdminOverview` issues seven `count` queries; that is fine for a staff page
  with tens of requests per hour.
* The leaderboard fetches up to 500 rows when ranking a profile. If your list
  grows past a few thousand players, replace `getPlayerRank`-style lookups with
  a materialised `leaderboard_rank` view refreshed on a schedule.

### Changing the point curve

```sql
create or replace function public.level_points(rank integer)
returns integer language sql immutable as $$
  select case when rank is null or rank < 1 then 0
    else greatest(1, round(300 * exp(-0.08 * (rank - 1)))::integer) end;
$$;

-- Re-apply to existing rows and recalculate totals
update public.levels set points = public.level_points(rank);
select public.recompute_points(id) from public.profiles;
```

Then mirror the formula in `src/lib/points.ts` (used for demo mode) and
redeploy.

### Scheduled pruning

```sql
-- keep one year of audit history
delete from public.audit_log where created_at < now() - interval '1 year';
```

Run it from the Supabase SQL editor or a `pg_cron` job — never from the app.

---

## 5. Cost expectations

| Item | Free tier | When you would upgrade |
| --- | --- | --- |
| Supabase | 500 MB DB, 5 GB egress, 50k MAU | thousands of daily players, PITR, no pausing |
| Vercel | Hobby: 100 GB bandwidth, serverless functions | commercial use, team features |
| Discord app | Free | never |

A demonlist with a few hundred levels and a few thousand monthly players fits
comfortably in the free tiers.

---

## 6. Common deployment problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| Still "Demo mode" in production | Env vars missing at build time | Add them in the host, redeploy, verify `/setup` |
| "Configuration required" screen | Production build without Supabase env vars | Same as above (this screen is intentionally shown instead of fake data) |
| Login loops back to `/login?error=missing_code` | Redirect URL not whitelisted for this origin | Add it in Supabase → URL Configuration |
| 500 on form submit, terminal logs "Missing origin header" | Reverse proxy rewrote `Host`/`Origin` | Preserve the original `Host` header, or add the origin to `ALLOWED_ORIGINS` |
| Page loads but CSS is missing behind a tunnel/preview proxy | Next blocks cross-origin dev assets | Add the domain to `ALLOWED_ORIGINS` (comma separated) and restart |
| Cookies not set | Site served over HTTP while `NEXT_PUBLIC_SITE_URL` is HTTPS (or vice versa) | Make origin and protocol consistent |
| `NEXT_PUBLIC_SITE_URL` wrong | Auth redirects point at localhost | Update the var, redeploy |
| Supabase project paused | Free tier inactivity | Open the dashboard to wake it; consider a small uptime ping |
