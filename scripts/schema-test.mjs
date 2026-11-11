#!/usr/bin/env node
/**
 * Schema + security self-test for Schemonlist.
 *
 *   npm run test:schema
 *
 * This runs supabase/schema.sql and supabase/seed.sql against an embedded
 * Postgres (PGlite, WASM) with a small Supabase-compatible environment:
 *
 *   - an `auth` schema with `auth.users` and `auth.uid()`
 *   - the `anon` and `authenticated` roles
 *
 * It then signs in as different users by setting `request.jwt.claims` and
 * asserts that Row Level Security allows exactly what it should. It is not a
 * replacement for testing against your real Supabase project, but it catches
 * schema and policy regressions in seconds and needs no Docker or network.
 *
 * Exit code 0 = every check passed.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const ADMIN = "11111111-1111-4111-8111-111111111111";
const PLAYER = "22222222-2222-4222-8222-222222222222";
const NEWBIE = "33333333-3333-4333-8333-333333333333";

const db = new PGlite();
let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`  ✅ ${label}`);
}

function bad(label, detail) {
  failed += 1;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function rows(sql) {
  const result = await db.query(sql);
  return result.rows;
}

async function exec(sql) {
  await db.exec(sql);
}

async function expectRows(label, sql) {
  try {
    const result = await rows(sql);
    if (result.length > 0) ok(`${label} (${result.length} row${result.length === 1 ? "" : "s"})`);
    else bad(label, "expected rows, got none");
  } catch (error) {
    bad(label, error.message.split("\n")[0]);
  }
}

async function expectNoRows(label, sql) {
  try {
    const result = await rows(sql);
    if (result.length === 0) ok(label);
    else bad(label, `leaked ${result.length} row(s)`);
  } catch (error) {
    ok(`${label} (blocked: ${error.message.split("\n")[0].slice(0, 60)})`);
  }
}

async function expectDenied(label, sql) {
  try {
    await exec(sql);
    bad(label, "statement was allowed");
  } catch {
    ok(label);
  }
}

async function expectNoChanges(label, sql) {
  try {
    const result = await db.query(sql);
    if (result.affectedRows === 0) ok(label);
    else bad(label, `changed ${result.affectedRows} row(s)`);
  } catch (error) {
    ok(`${label} (blocked: ${error.message.split("\n")[0].slice(0, 60)})`);
  }
}

async function as(uid) {
  const claims = uid
    ? JSON.stringify({ sub: uid, role: "authenticated" })
    : "";
  await exec(`select set_config('request.jwt.claims', '${claims}', false)`);
  await exec(`reset role`);
  await exec(`set role ${uid ? "authenticated" : "anon"}`);
}

async function asAdmin() {
  await exec("reset role");
  await exec(`select set_config('request.jwt.claims', '', false)`);
}

// ---------------------------------------------------------------------------
console.log("\nSchemonlist schema + security test\n");

/* 1. Supabase-compatible bootstrap ---------------------------------------- */
await exec(`
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    email text
  );
  create or replace function auth.uid() returns uuid
  language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
  $$;
  create role anon;
  create role authenticated;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
`);

const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8").replace(
  /create extension if not exists pgcrypto;/i,
  ""
);

console.log("Applying schema.sql …");
await exec(schema);
console.log("Applying seed.sql …\n");
await exec(readFileSync(join(root, "supabase/seed.sql"), "utf8"));

/* 2. Schema exists --------------------------------------------------------- */
console.log("Schema");
await expectRows("15 seeded levels with computed points", `
  select name, points from levels where is_listed and rank is not null limit 15
`);
const rank1 = await rows("select points from levels where rank = 1");
if (rank1[0]?.points === 250) ok("rank 1 is worth 250 points");
else bad("rank 1 points", JSON.stringify(rank1));

/* 3. Profile creation trigger --------------------------------------------- */
console.log("\nDiscord signup trigger");
await exec(`
  insert into auth.users (id, raw_user_meta_data) values
    ('${ADMIN}', '{"preferred_username":"Admin_Person","full_name":"Admin Person","avatar_url":"https://cdn.discordapp.com/a.png"}'),
    ('${PLAYER}', '{"preferred_username":"Player One","full_name":"Player One"}'),
    ('${NEWBIE}', '{"preferred_username":"x"}');
`);
await expectRows("a profile is created for every auth user", `select id from profiles`);
await expectRows("usernames are sanitised", `select username from profiles where id = '${PLAYER}' and username = 'PlayerOne'`);
await expectRows("too-short usernames fall back to a generated one", `select username from profiles where id = '${NEWBIE}' and username like 'player-%'`);

await exec(`insert into auth.users (id, raw_user_meta_data) values
  ('44444444-4444-4444-8444-444444444444', '{"preferred_username":"admin_person"}')`);
await expectRows("duplicate Discord names get a suffix", `select username from profiles where id = '44444444-4444-4444-8444-444444444444' and username = 'admin_person-1'`);

/* 4. Players --------------------------------------------------------------- */
console.log("\nPlayer permissions");
const acheron = (await rows("select id from levels where slug = 'acheron'"))[0].id;
await as(PLAYER);

await expectDenied("cannot insert levels", `insert into levels (slug, name, tier) values ('hacked','Hacked','extreme')`);
await expectDenied("cannot change their role", `update profiles set role = 'admin' where id = '${PLAYER}'`);
await expectDenied("cannot change their points", `update profiles set points = 99999 where id = '${PLAYER}'`);
await expectDenied("cannot read ban_reason", `select ban_reason from profiles limit 1`);
await expectDenied("cannot read the audit log", `select * from audit_log limit 1`);
await expectDenied("cannot call admin RPCs", `select admin_set_role('${PLAYER}', 'admin')`);
await expectNoChanges("cannot change another account's name", `update profiles set display_name = 'pwned' where id = '${ADMIN}'`);
await expectNoRows("cannot see unlisted levels", `select id from levels where not is_listed`);

await exec(`
  insert into records (level_id, user_id, kind, progress, video_url)
  values ('${acheron}', '${PLAYER}', 'completion', 100, 'https://youtu.be/aaaaaaaaaaa')
`);
const forced = await rows(`select status from records where user_id = '${PLAYER}'`);
if (forced[0]?.status === "pending") ok("own submission is accepted as pending");
else bad("submission status", JSON.stringify(forced));

await exec(`
  insert into records (level_id, user_id, kind, status, progress, video_url)
  values ('${acheron}', '${PLAYER}', 'verification', 'approved', 100, 'https://youtu.be/bbbbbbbbbbb')
`);
const selfApproved = await rows(`select status from records where user_id = '${PLAYER}' and kind = 'verification'`);
if (selfApproved[0]?.status === "pending") ok("a self-approved insert is downgraded to pending");
else bad("self-approval was not downgraded", JSON.stringify(selfApproved));

await expectNoChanges("cannot approve their own record", `update records set status = 'approved' where user_id = '${PLAYER}'`);
await expectNoChanges("cannot delete another player's record", `delete from records where user_id <> '${PLAYER}'`);
await expectNoRows("cannot see other players' pending records", `select id from records where status = 'pending' and user_id <> '${PLAYER}'`);
await expectNoChanges("cannot submit for an unlisted level (the level is invisible)", `
  insert into records (level_id, user_id, kind, progress, video_url)
  select id, '${PLAYER}', 'completion', 100, 'https://youtu.be/ccccccccccc'
  from levels where not is_listed limit 1
`);

/* 5. Anonymous visitors ---------------------------------------------------- */
console.log("\nAnonymous permissions");
await as(null);
await expectRows("can read listed levels", `select id from levels where is_listed limit 1`);
await expectNoRows("cannot see unlisted levels", `select id from levels where not is_listed`);
await expectDenied("cannot submit records", `
  insert into records (level_id, user_id, kind, progress, video_url)
  values ('${acheron}', '${PLAYER}', 'completion', 100, 'https://youtu.be/ddddddddddd')
`);
await expectDenied("cannot read the audit log", `select * from audit_log limit 1`);
await expectRows("can read the leaderboard view", `select id from leaderboard limit 1`);

/* 6. Admins ---------------------------------------------------------------- */
console.log("\nAdmin permissions");
await asAdmin();
await exec(`update profiles set role = 'admin' where id = '${ADMIN}'`);
await as(ADMIN);

await expectRows("can see the moderation queue", `select id from records where status = 'pending'`);
const pending = await rows("select id from records where status = 'pending' limit 1");
if (pending.length > 0) {
  await exec(`update records set status = 'approved', reviewer_note = 'verified' where id = '${pending[0].id}'`);
  const reviewed = await rows(`select status, reviewer_id, reviewed_at from records where id = '${pending[0].id}'`);
  if (reviewed[0]?.status === "approved" && reviewed[0]?.reviewer_id === ADMIN && reviewed[0]?.reviewed_at) {
    ok("approving stamps reviewer_id and reviewed_at");
  } else {
    bad("approval stamping", JSON.stringify(reviewed));
  }
  const points = await rows(`select points from profiles where id = '${PLAYER}'`);
  if (points[0]?.points > 0) ok(`approval awards points (${points[0].points})`);
  else bad("approval did not award points");
}

await expectRows("can create levels", `insert into levels (slug, name, tier, rank, is_listed) values ('t','T','insane',99,true) returning id`);
await expectRows("can read the audit log", `select id from admin_recent_audit(10)`);
await expectRows("can read ban reasons", `select * from admin_list_users('PlayerOne')`);
await exec(`select admin_set_ban('${PLAYER}', true, 'testing')`);
const banned = await rows(`select is_banned from profiles where id = '${PLAYER}'`);
if (banned[0]?.is_banned === true) ok("can ban accounts");
else bad("ban did not apply");
await expectDenied("cannot change their own role", `select admin_set_role('${ADMIN}', 'player')`);
await expectNoRows("banned player is hidden from the leaderboard", `select id from leaderboard where id = '${PLAYER}'`);

/* 7. Rate limit ------------------------------------------------------------ */
console.log("\nAbuse controls");
await as(NEWBIE);
const targets = await rows("select id from levels where is_listed order by rank limit 15");
let limited = false;
for (const [index, level] of targets.entries()) {
  try {
    await exec(`
      insert into records (level_id, user_id, kind, progress, video_url)
      values ('${level.id}', '${NEWBIE}', 'completion', 100, 'https://youtu.be/eeeeeeeeeee${index}')
    `);
  } catch (error) {
    limited = /Too many submissions/i.test(error.message);
    break;
  }
}
if (limited) ok("the 11th submission in an hour is rejected");
else bad("rate limit did not trigger");

/* 8. Scoring follows the data --------------------------------------------- */
console.log("\nScoring");
await asAdmin();
await exec(`update levels set rank = 50 where slug = 'acheron'`);
const afterRank = await rows(`select p.points, l.points as level_points from profiles p, levels l
  where p.id = '${PLAYER}' and l.slug = 'acheron'`);
if (afterRank[0]?.points === afterRank[0]?.level_points) ok("changing a rank recalculates player points");
else bad("points did not follow the rank", JSON.stringify(afterRank));

await exec(`delete from records where status = 'approved'`);
const afterDelete = await rows(`select points from profiles where id = '${PLAYER}'`);
if (afterDelete[0]?.points === 0) ok("deleting an approved record removes its points");
else bad("points survived record deletion", JSON.stringify(afterDelete));

/* 9. Summary --------------------------------------------------------------- */
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
