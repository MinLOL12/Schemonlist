# Admin guide

Everything a moderator or administrator does day to day. The panel lives at
`/admin` and is only visible to accounts with the `admin` role; the review queue
is also available to `moderator` accounts.

---

## Roles

| Capability | Player | Moderator | Admin |
| --- | --- | --- | --- |
| Browse the list, submit records | ✅ | ✅ | ✅ |
| See the review queue | — | ✅ | ✅ |
| Approve / reject records | — | ✅ | ✅ |
| Read the audit log | — | — | ✅ |
| Add / edit / delete levels | — | — | ✅ |
| Assign verifiers, change ranks | — | — | ✅ |
| Change roles, ban accounts | — | — | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |

Roles are stored in `profiles.role` and enforced by RLS. A moderator cannot
promote themselves, edit the list or read private ban reasons. If you change the
schema or a policy, run `npm run test:schema` before deploying.

---

## Reviewing submissions

`/admin/submissions` lists every pending claim oldest-first. For each one you
see the player, the level, the kind (completion/verification), the claimed
progress, the submitted time and the video URL.

Workflow:

1. **Open the video.** Confirm it is the correct level, starts at 0%, ends at
   100%, and has no cuts, clicks or speed-ups.
2. **Check for duplicates.** A player may hold one approved completion *and* one
   approved verification per level, never two of the same kind.
3. **Approve** — points are awarded immediately and the record appears on the
   player's public profile and the level page.
4. **Reject with a note.** The note is shown to the player on `/profile`, so be
   specific: *"Video starts at 43%, please resubmit the full run."* Rejecting
   silently is what generates support messages.

The note field is optional when approving and limited to 500 characters.

> Approving a record on an unlisted level awards nothing. Points only count for
> levels that are on the list.

### What to reject

* Edited footage, cuts, or a run that does not start at 0%.
* Recorded on a copy with verified hacks, noclip or speedhack.
* Level name/version mismatch (e.g. a buffed or nerfed copy).
* "Verification" claims from someone who is not the verifier and has no
  evidence.
* Duplicate claims for a level the player already has approved.

Bans are for repeat offenders or fake evidence; a single bad submission usually
deserves a rejection with a note.

---

## Managing levels

### Add a level

`/admin/levels` → **+ Add level** (`/admin/levels/new`).

| Field | Notes |
| --- | --- |
| Name | Shown everywhere. 2–80 characters |
| Slug | URL segment (`/levels/<slug>`). Auto-generated from the name if empty. Changing it breaks old links |
| Creators | Comma separated, up to 8. First one is used as the default publisher if you leave publisher empty |
| Publisher | Optional, defaults to the first creator in display |
| Difficulty | Easy / Medium / Hard / Insane / Extreme demon — purely cosmetic on the list |
| Rank | Whole number. **Unique** — two levels cannot share a rank. Leave empty for an unranked draft |
| GD level ID | The numeric in-game ID, optional |
| Verifier | Picked from registered accounts. Shows on the level page and awards the verification record |
| Video URL | Verification video. `https://` only |
| Thumbnail | Optional image URL |
| Description | Up to 2000 characters, whitespace preserved |
| Listed publicly | Off = hidden from players; staff still see it in the panel |

Points are never typed in: the database derives them from the rank via
`level_points()`.

### Rank changes and renumbering

Ranks are unique, so swapping two levels requires a temporary value. The easiest
guaranteed way is a single transaction in the SQL editor:

```sql
-- Move "Tartarus" from #4 to #2 and push the others down
begin;
update public.levels set rank = null where slug = 'tartarus';
update public.levels set rank = rank + 1 where rank >= 2 and rank < 4;
update public.levels set rank = 2 where slug = 'tartarus';
commit;
```

Everything recalculates automatically, including every player's total. If you
prefer the UI, clear the rank of the level you are moving, renumber the others,
then set the new rank.

### Removing a level

Delete it from the list page or the edit page. Records cascade-delete and points
recalculate. If you only want to take it off the list temporarily, **uncheck
"Listed publicly"** — history is preserved and no points are awarded while it is
hidden.

### Verification records

Assigning a verifier in the level form does not create a record. The verifier
should submit a verification claim like any player, or you can approve an
existing claim and then set the verifier field.

---

## Accounts

`/admin/users` lists up to 200 accounts; use the search box for the rest.

* **Role** — pick player/moderator/admin and press **Set**. You cannot change
  your own role (prevents locking yourself out); use SQL if you must.
* **Ban** — expands a reason field. Banning:
  * rejects all of the player's pending submissions,
  * blocks new submissions at the database level,
  * hides them from the leaderboard,
  * keeps their approved history and points for the record (they are simply not
    ranked).
* **Unban** — clears the flag and the reason. Their next submission is accepted
  normally; previously rejected records stay rejected.

Moderator warnings are not a built-in feature — use the rejection note, or the
reason field on a ban.

---

## Audit log

`/admin/audit` shows the last 100 entries with actor, action, entity and a JSON
snapshot. Entries are written by Postgres triggers, so even a compromised admin
session cannot delete or forge history. Use it to answer "who unlisted this
level?" or "who approved this record?".

Retention is unlimited until you prune it (see
[DEPLOYMENT.md](DEPLOYMENT.md#scheduled-pruning)).

---

## Rescue recipes (SQL editor)

```sql
-- Who are the admins?
select username, role, is_banned from public.profiles where role <> 'player';

-- Make someone an admin manually
update public.profiles set role = 'admin' where username = 'name';

-- Unban
update public.profiles set is_banned = false, ban_reason = null where username = 'name';

-- Recalculate everybody's points after a manual data change
select public.recompute_points(id) from public.profiles;

-- Inspect a player's submissions
select l.name, r.kind, r.status, r.progress, r.video_url, r.created_at
from public.records r join public.levels l on l.id = r.level_id
where r.user_id = (select id from public.profiles where username = 'name')
order by r.created_at desc;

-- Reject a record and record why
update public.records
set status = 'rejected', reviewer_note = 'Reason', reviewed_at = now()
where id = '<record-uuid>';
```

After any manual SQL that touches `records`, `levels` or `profiles.points`, the
triggers keep totals in sync; the `recompute_points` line above is only needed
after edits that bypass those triggers (for example restoring a backup).

---

## Etiquette that keeps the list trustworthy

1. **One reviewer per record.** If two admins are in the queue, claim records out
   loud in Discord; double reviews cause duplicate approvals and confused
   players.
2. **Write rejection notes.** It saves everyone time.
3. **Recuse yourself** from your own submissions or your friends'. The database
   cannot enforce this — it is a social rule.
4. **Unlist before deleting.** Deleting a level destroys the only proof of a
   player's record.
5. **Document rule changes.** If you start accepting 60% runs, say so on the
   site; players compare notes.
