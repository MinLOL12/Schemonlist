-- ============================================================================
--  SCHEMONLIST — database schema, row level security and admin functions
-- ============================================================================
--  HOW TO USE
--    1. Open your Supabase project.
--    2. Go to  SQL Editor -> New query.
--    3. Paste this ENTIRE file and press "Run".
--    4. Optionally run supabase/seed.sql to get a starter demonlist.
--
--  This file is idempotent: it is safe to run more than once (it will not
--  delete your data). If you change a table definition later, use a migration
--  instead of editing this file in place.
--
--  SECURITY MODEL (read docs/SECURITY.md for the full explanation)
--    * Every table has Row Level Security enabled.
--    * Anonymous visitors may only read levels that admins marked as listed,
--      public profile columns, and approved records.
--    * Players may only insert their own records, always forced to "pending".
--    * Only profiles with role = 'admin' may write levels / review records.
--    * Privileged account changes (role, ban, points) go through SECURITY
--      DEFINER functions that re-check the caller, and a trigger blocks
--      privilege escalation even if someone finds another write path.
--    * Every meaningful change is written to an admin-only audit log by
--      triggers, so clients can never forge log entries.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('player', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.record_kind as enum ('completion', 'verification');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.record_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.demon_tier as enum ('easy', 'medium', 'hard', 'insane', 'extreme');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- One row per Discord account. Created automatically by the auth trigger below.
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text not null,
  display_name     text,
  discord_username text,
  avatar_url       text,
  role             public.user_role not null default 'player',
  points           integer not null default 0,
  is_banned        boolean not null default false,
  ban_reason       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_.-]{3,24}$'),
  constraint profiles_avatar_scheme check (avatar_url is null or avatar_url ~* '^https?://')
);

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- A ranked level. `rank` is null while a level is unranked / not on the list.
create table if not exists public.levels (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  creators      text[] not null default '{}',
  publisher     text,
  gd_level_id   text,
  tier          public.demon_tier not null default 'extreme',
  rank          integer unique,
  points        integer not null default 0,
  video_url     text,
  thumbnail_url text,
  description   text,
  is_listed     boolean not null default false,
  verifier_id   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint levels_rank_positive check (rank is null or rank > 0),
  constraint levels_video_url_scheme check (video_url is null or video_url ~* '^https?://'),
  constraint levels_thumbnail_url_scheme check (thumbnail_url is null or thumbnail_url ~* '^https?://')
);

create index if not exists levels_rank_idx on public.levels (rank) where is_listed;

-- A player's claim: "I beat this" or "I verified this".
create table if not exists public.records (
  id            uuid primary key default gen_random_uuid(),
  level_id      uuid not null references public.levels(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          public.record_kind not null default 'completion',
  progress      integer not null default 100,
  video_url     text not null,
  status        public.record_status not null default 'pending',
  reviewer_id   uuid references public.profiles(id) on delete set null,
  reviewer_note text,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint records_progress_range check (progress between 1 and 100),
  constraint records_video_url_scheme check (video_url ~* '^https?://')
);

create index if not exists records_level_idx on public.records (level_id, status);
create index if not exists records_user_idx on public.records (user_id, status);
create index if not exists records_status_idx on public.records (status, created_at desc);

-- At most one *approved* claim of each kind per player per level.
create unique index if not exists records_one_approved_per_kind
  on public.records (level_id, user_id, kind) where status = 'approved';

-- Admin-only audit trail. Written exclusively by triggers.
create table if not exists public.audit_log (
  id         bigserial primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Scoring
-- ---------------------------------------------------------------------------
-- Same curve is used by src/lib/points.ts (demo mode). Rank 1 = 250 points,
-- falling off exponentially so lower ranks are worth less.
create or replace function public.level_points(rank integer)
returns integer
language sql
immutable
as $$
  select case
    when rank is null or rank < 1 then 0
    else greatest(1, round(250 * exp(-0.09 * (rank - 1)))::integer)
  end;
$$;

-- Recalculates a player's score from their approved records.
-- Points are counted once per level, and only for levels that are on the list.
create or replace function public.recompute_points(uid uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Tell the profile guard that this write comes from the scoring system.
  perform set_config('schemonlist.internal', 'on', true);

  update public.profiles p
  set points = coalesce((
    select sum(scored.points)
    from (
      select distinct on (r.level_id) l.points
      from public.records r
      join public.levels l on l.id = r.level_id
      where r.user_id = uid
        and r.status = 'approved'
        and l.is_listed
      order by r.level_id, (r.kind = 'verification') desc
    ) scored
  ), 0)
  where p.id = uid;

  perform set_config('schemonlist.internal', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Helper functions used by RLS policies
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_banned
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator') and not is_banned
  );
$$;

create or replace function public.current_user_is_banned()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select is_banned from public.profiles where id = auth.uid()
  ), true);
$$;

-- ---------------------------------------------------------------------------
-- 5. Triggers: timestamps, scoring, guards, audit
-- ---------------------------------------------------------------------------

create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists levels_touch_updated_at on public.levels;
create trigger levels_touch_updated_at before update on public.levels
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists records_touch_updated_at on public.records;
create trigger records_touch_updated_at before update on public.records
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

-- Keep levels.points in sync with the rank.
create or replace function public.tg_level_points()
returns trigger language plpgsql as $$
begin
  new.points := public.level_points(new.rank);
  return new;
end;
$$;

drop trigger if exists levels_set_points on public.levels;
create trigger levels_set_points before insert or update of rank, points on public.levels
  for each row execute function public.tg_level_points();

-- If a level's score or visibility changes, every player's total must follow.
create or replace function public.tg_level_after_change()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
declare r record;
begin
  if tg_op = 'DELETE' then
    for r in select distinct user_id from public.records where level_id = old.id loop
      perform public.recompute_points(r.user_id);
    end loop;
    return old;
  end if;

  if new.points is distinct from old.points or new.is_listed is distinct from old.is_listed then
    for r in select distinct user_id from public.records where level_id = new.id loop
      perform public.recompute_points(r.user_id);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists levels_after_change on public.levels;
create trigger levels_after_change after update or delete on public.levels
  for each row execute function public.tg_level_after_change();

-- Point totals follow approved records.
create or replace function public.tg_record_recompute()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    perform public.recompute_points(new.user_id);
  elsif tg_op = 'DELETE' then
    perform public.recompute_points(old.user_id);
  else
    perform public.recompute_points(old.user_id);
    if new.user_id is distinct from old.user_id then
      perform public.recompute_points(new.user_id);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists records_recompute_points on public.records;
create trigger records_recompute_points after insert or update or delete on public.records
  for each row execute function public.tg_record_recompute();

-- Players can never approve their own record, and only staff may set a review.
create or replace function public.tg_records_guard()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
begin
  -- No JWT (SQL editor, service role, other triggers): trust the writer.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_staff() then
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      new.reviewer_id := auth.uid();
      new.reviewed_at := now();
    end if;
    return new;
  end if;

  -- Normal player: force ownership + pending status on insert.
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.reviewer_id := null;
    new.reviewed_at := null;
    new.reviewer_note := null;
    if public.current_user_is_banned() then
      raise exception 'Your account is banned and cannot submit records.' using errcode = '42501';
    end if;
    -- Simple abuse protection: 10 submissions per hour.
    if (select count(*) from public.records
        where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'Too many submissions in the last hour. Please wait before submitting again.'
        using errcode = '53400';
    end if;
    return new;
  end if;

  raise exception 'You are not allowed to edit this record.' using errcode = '42501';
end;
$$;

drop trigger if exists records_guard on public.records;
create trigger records_guard before insert or update on public.records
  for each row execute function public.tg_records_guard();

-- Privilege escalation guard: a player may edit only their own cosmetic fields.
create or replace function public.tg_profiles_guard()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null
     or current_setting('schemonlist.internal', true) = 'on'
     or public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.points is distinct from old.points
     or new.is_banned is distinct from old.is_banned
     or new.ban_reason is distinct from old.ban_reason
     or new.created_at is distinct from old.created_at then
    raise exception 'You are not allowed to change protected profile fields.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.tg_profiles_guard();

-- Create a profile for every new Discord account, with a unique username.
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
declare
  base  text;
  uname text;
  n     integer := 0;
begin
  base := coalesce(
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    'player'
  );
  base := regexp_replace(base, '[^A-Za-z0-9_.-]', '', 'g');
  if length(base) < 3 then
    base := 'player-' || substr(new.id::text, 1, 6);
  end if;
  uname := left(base, 20);
  while exists (select 1 from public.profiles where lower(username) = lower(uname)) loop
    n := n + 1;
    uname := left(base, 17) || '-' || n::text;
  end loop;

  insert into public.profiles (id, username, display_name, discord_username, avatar_url)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'preferred_username', uname),
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit trail (trigger-only, so entries cannot be forged by clients).
create or replace function public.tg_audit()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
declare
  payload jsonb;
  eid     text;
begin
  if tg_op = 'DELETE' then
    payload := to_jsonb(old);
    eid := old.id::text;
  else
    payload := to_jsonb(new);
    eid := new.id::text;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), tg_table_name || '.' || lower(tg_op), tg_table_name, eid, payload);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists levels_audit on public.levels;
create trigger levels_audit after insert or update or delete on public.levels
  for each row execute function public.tg_audit();

drop trigger if exists records_audit on public.records;
create trigger records_audit after update on public.records
  for each row when (old.status is distinct from new.status)
  execute function public.tg_audit();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit after update on public.profiles
  for each row when (old.role is distinct from new.role or old.is_banned is distinct from new.is_banned)
  execute function public.tg_audit();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.levels    enable row level security;
alter table public.records   enable row level security;
alter table public.audit_log enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- levels --------------------------------------------------------------------
drop policy if exists levels_select on public.levels;
create policy levels_select on public.levels
  for select using (is_listed or public.is_staff());

drop policy if exists levels_admin_write on public.levels;
create policy levels_admin_write on public.levels
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- records -------------------------------------------------------------------
drop policy if exists records_select on public.records;
create policy records_select on public.records
  for select using (status = 'approved' or user_id = auth.uid() or public.is_staff());

drop policy if exists records_insert_self on public.records;
create policy records_insert_self on public.records
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and not public.current_user_is_banned()
    and exists (select 1 from public.levels l where l.id = level_id and l.is_listed)
  );

drop policy if exists records_update_staff on public.records;
create policy records_update_staff on public.records
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists records_delete_own_or_staff on public.records;
create policy records_delete_own_or_staff on public.records
  for delete to authenticated
  using ((user_id = auth.uid() and status = 'pending') or public.is_staff());

-- audit_log: no client policies at all -> only SECURITY DEFINER code and the
-- admin RPC below can read it. That is intentional.

-- ---------------------------------------------------------------------------
-- 7. Table privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
grant select (id, username, display_name, discord_username, avatar_url, role, points,
              is_banned, created_at, updated_at)
  on public.profiles to anon, authenticated;
-- Players may only edit their own cosmetic fields. Everything else (role,
-- points, bans) is reachable exclusively through the admin RPCs below.
grant update (username, display_name, avatar_url) on public.profiles to authenticated;

revoke all on public.levels from anon, authenticated;
grant select on public.levels to anon, authenticated;
grant insert, update, delete on public.levels to authenticated;

revoke all on public.records from anon, authenticated;
grant select on public.records to anon, authenticated;
grant select, insert, update, delete on public.records to authenticated;

revoke all on public.audit_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Views
-- ---------------------------------------------------------------------------
-- Public leaderboard. security_invoker means RLS of the underlying tables
-- applies to whoever queries the view.
create or replace view public.leaderboard
with (security_invoker = true)
as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.role,
  p.points,
  p.created_at,
  (select count(*) from public.records r
     where r.user_id = p.id and r.status = 'approved') as records_count,
  (select count(*) from public.records r
     where r.user_id = p.id and r.status = 'approved' and r.kind = 'verification') as verifications
from public.profiles p
where not p.is_banned;

grant select on public.leaderboard to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Admin RPCs
--    These run as the table owner after checking is_admin(), so they can touch
--    columns that normal clients cannot (ban_reason, role, ...).
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_users(search text default null)
returns table (
  id uuid, username text, display_name text, discord_username text, avatar_url text,
  role public.user_role, points integer, is_banned boolean, ban_reason text,
  created_at timestamptz, approved_records bigint
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  return query
    select p.id, p.username, p.display_name, p.discord_username, p.avatar_url,
           p.role, p.points, p.is_banned, p.ban_reason, p.created_at,
           (select count(*) from public.records r where r.user_id = p.id and r.status = 'approved')
    from public.profiles p
    where search is null
       or search = ''
       or p.username ilike '%' || search || '%'
       or coalesce(p.discord_username, '') ilike '%' || search || '%'
    order by p.created_at asc
    limit 200;
end;
$$;

create or replace function public.admin_set_role(target_id uuid, new_role public.user_role)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;
  update public.profiles set role = new_role where id = target_id;
end;
$$;

create or replace function public.admin_set_ban(target_id uuid, banned boolean, reason text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot ban yourself.' using errcode = '42501';
  end if;

  update public.profiles
  set is_banned = banned,
      ban_reason = case when banned then reason else null end
  where id = target_id;

  -- Banned players cannot keep pending claims in the queue.
  if banned then
    update public.records set status = 'rejected', reviewer_id = auth.uid(),
      reviewer_note = coalesce('Account banned: ' || reason, 'Account banned'),
      reviewed_at = now()
    where user_id = target_id and status = 'pending';
  end if;
end;
$$;

create or replace function public.admin_recent_audit(limit_n integer default 50)
returns table (
  id bigint, actor_id uuid, action text, entity text, entity_id text,
  details jsonb, created_at timestamptz
)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  return query
    select a.id, a.actor_id, a.action, a.entity, a.entity_id, a.details, a.created_at
    from public.audit_log a
    order by a.created_at desc
    limit least(coalesce(limit_n, 50), 200);
end;
$$;

-- Only signed-in users need to call these; revoke from anon for clarity.
revoke execute on function public.admin_list_users(text) from anon;
revoke execute on function public.admin_set_role(uuid, public.user_role) from anon;
revoke execute on function public.admin_set_ban(uuid, boolean, text) from anon;
revoke execute on function public.admin_recent_audit(integer) from anon;

-- Internal helpers: triggers call these as the table owner. Clients never need
-- to execute them directly, so take away the default PUBLIC grant.
revoke execute on function public.recompute_points(uuid) from public;
revoke execute on function public.tg_audit() from public;

-- ---------------------------------------------------------------------------
-- 10. Backfill (safe on an existing project)
-- ---------------------------------------------------------------------------
-- Create missing profiles for accounts that signed up before this schema ran.
insert into public.profiles (id, username, display_name, discord_username, avatar_url)
select
  u.id,
  left(coalesce(
    nullif(regexp_replace(coalesce(u.raw_user_meta_data->>'preferred_username',
                                   u.raw_user_meta_data->>'user_name', 'player'), '[^A-Za-z0-9_.-]', '', 'g'), ''),
    'player'), 14) || '-' || substr(u.id::text, 1, 4),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'preferred_username'),
  u.raw_user_meta_data->>'preferred_username',
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ============================================================================
--  Done. Next steps:
--    * Run supabase/seed.sql (optional starter levels).
--    * Promote yourself:  update public.profiles set role = 'admin'
--                        where username = 'your_username';
--    * Read docs/SUPABASE_SETUP.md and docs/SECURITY.md.
-- ============================================================================
