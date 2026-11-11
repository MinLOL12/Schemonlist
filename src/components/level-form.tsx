"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { saveLevelAction } from "@/actions/levels";
import { Notice } from "@/components/notice";
import { TIERS, TIER_ORDER } from "@/lib/points";
import type { ActionResult, AdminUser, Level } from "@/lib/types";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : editing ? "Save level" : "Create level"}
    </button>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-300">{message}</p>;
}

export function LevelForm({
  level,
  users,
  nextRank,
}: {
  level?: Level;
  users: AdminUser[];
  nextRank?: number;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(saveLevelAction, {
    status: "idle",
  });

  return (
    <form action={formAction} className="space-y-6">
      {level ? <input type="hidden" name="id" value={level.id} /> : null}

      {state.status === "error" ? (
        <Notice variant="error" title="Could not save">
          {state.message}
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">Level name</label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={level?.name ?? ""}
            placeholder="Acheron"
            required
            maxLength={80}
          />
          <ErrorText message={state.fieldErrors?.name} />
        </div>
        <div>
          <label htmlFor="slug" className="label">URL slug</label>
          <input
            id="slug"
            name="slug"
            className="input"
            defaultValue={level?.slug ?? ""}
            placeholder="auto-generated from the name"
            maxLength={80}
          />
          <ErrorText message={state.fieldErrors?.slug} />
          <p className="hint">Lowercase letters, numbers and dashes.</p>
        </div>

        <div>
          <label htmlFor="creators" className="label">Creators</label>
          <input
            id="creators"
            name="creators"
            className="input"
            defaultValue={level?.creators.join(", ") ?? ""}
            placeholder="Ryamu, Cursed"
            maxLength={400}
          />
          <p className="hint">Comma separated, up to 8 names.</p>
        </div>
        <div>
          <label htmlFor="publisher" className="label">Publisher</label>
          <input
            id="publisher"
            name="publisher"
            className="input"
            defaultValue={level?.publisher ?? ""}
            placeholder="Ryamu"
            maxLength={40}
          />
        </div>

        <div>
          <label htmlFor="tier" className="label">Difficulty</label>
          <select id="tier" name="tier" className="input" defaultValue={level?.tier ?? "extreme"}>
            {TIER_ORDER.map((tier) => (
              <option key={tier} value={tier}>
                {TIERS[tier].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rank" className="label">Rank</label>
          <input
            id="rank"
            name="rank"
            type="number"
            min={1}
            max={10000}
            className="input"
            defaultValue={level?.rank ?? nextRank ?? ""}
            placeholder="Leave empty for unranked"
          />
          <ErrorText message={state.fieldErrors?.rank} />
          <p className="hint">Points are calculated automatically from the rank.</p>
        </div>

        <div>
          <label htmlFor="gd_level_id" className="label">GD level ID</label>
          <input
            id="gd_level_id"
            name="gd_level_id"
            className="input"
            defaultValue={level?.gd_level_id ?? ""}
            placeholder="74245010"
            maxLength={24}
          />
          <ErrorText message={state.fieldErrors?.gd_level_id} />
        </div>
        <div>
          <label htmlFor="verifier_id" className="label">Verifier</label>
          <select
            id="verifier_id"
            name="verifier_id"
            className="input"
            defaultValue={level?.verifier_id ?? ""}
          >
            <option value="">No verifier assigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name ?? user.username} (@{user.username})
              </option>
            ))}
          </select>
          <ErrorText message={state.fieldErrors?.verifier_id} />
        </div>

        <div>
          <label htmlFor="video_url" className="label">Verification video URL</label>
          <input
            id="video_url"
            name="video_url"
            type="url"
            className="input"
            defaultValue={level?.video_url ?? ""}
            placeholder="https://youtube.com/watch?v=…"
            maxLength={500}
          />
          <ErrorText message={state.fieldErrors?.video_url} />
        </div>
        <div>
          <label htmlFor="thumbnail_url" className="label">Thumbnail URL (optional)</label>
          <input
            id="thumbnail_url"
            name="thumbnail_url"
            type="url"
            className="input"
            defaultValue={level?.thumbnail_url ?? ""}
            placeholder="https://…"
            maxLength={500}
          />
          <ErrorText message={state.fieldErrors?.thumbnail_url} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea
          id="description"
          name="description"
          className="input min-h-28 resize-y"
          defaultValue={level?.description ?? ""}
          maxLength={2000}
          placeholder="What makes this level notable? Recommended routes, difficulty notes, history…"
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <input
          type="checkbox"
          name="is_listed"
          defaultChecked={level ? level.is_listed : true}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#070a14] accent-cyan-400"
        />
        <span>
          <span className="block text-sm font-semibold text-white">Listed publicly</span>
          <span className="block text-xs text-slate-400">
            Unlisted levels are hidden from players but still visible here. Points
            only count while a level is listed.
          </span>
        </span>
      </label>

      <div className="flex justify-end gap-2">
        <SubmitButton editing={Boolean(level)} />
      </div>
    </form>
  );
}
