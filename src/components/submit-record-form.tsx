"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitRecordAction } from "@/actions/records";
import { Notice } from "@/components/notice";
import type { ActionResult, LevelOption } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? "Sending…" : "Submit for review"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-300">{message}</p>;
}

export function SubmitRecordForm({
  levels,
  defaultLevelId,
  disabled = false,
}: {
  levels: LevelOption[];
  defaultLevelId?: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(submitRecordAction, {
    status: "idle",
  });

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "error" ? (
        <Notice variant="error" title="Could not submit">
          {state.message}
        </Notice>
      ) : null}
      {state.status === "success" ? (
        <Notice variant="success" title="Submission sent">
          {state.message}{" "}
          <Link href="/profile" className="link font-semibold">
            View your submissions
          </Link>
          .
        </Notice>
      ) : null}

      <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
        <div>
          <label htmlFor="level_id" className="label">Level</label>
          <select
            id="level_id"
            name="level_id"
            className="input"
            defaultValue={defaultLevelId ?? ""}
            required
          >
            <option value="" disabled>Select a level…</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.rank ? `#${level.rank} · ` : ""}
                {level.name} — {level.points} pts
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors?.level_id} />
          <p className="hint">Only levels currently on the list can be submitted.</p>
        </div>

        <div>
          <span className="label">What are you claiming?</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="kind"
                value="completion"
                defaultChecked
                className="peer sr-only"
              />
              <span className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition peer-checked:border-violet-400/60 peer-checked:bg-violet-400/10 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400/40">
                <span className="block text-sm font-semibold text-white">Completion</span>
                <span className="mt-1 block text-xs text-slate-400">
                  I beat this level. Video must show the full run.
                </span>
              </span>
            </label>
            <label className="relative cursor-pointer">
              <input type="radio" name="kind" value="verification" className="peer sr-only" />
              <span className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition peer-checked:border-cyan-400/60 peer-checked:bg-cyan-400/10 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-400/40">
                <span className="block text-sm font-semibold text-white">Verification</span>
                <span className="mt-1 block text-xs text-slate-400">
                  I verified this level before it was published.
                </span>
              </span>
            </label>
          </div>
          <FieldError message={state.fieldErrors?.kind} />
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div>
            <label htmlFor="progress" className="label">Progress %</label>
            <input
              id="progress"
              name="progress"
              type="number"
              min={1}
              max={100}
              defaultValue={100}
              className="input"
              required
            />
            <FieldError message={state.fieldErrors?.progress} />
          </div>
          <div>
            <label htmlFor="video_url" className="label">Video link</label>
            <input
              id="video_url"
              name="video_url"
              type="url"
              inputMode="url"
              placeholder="https://youtube.com/watch?v=…"
              className="input"
              required
              maxLength={500}
            />
            <FieldError message={state.fieldErrors?.video_url} />
            <p className="hint">
              YouTube is preferred. The video must be public while the record is
              being reviewed.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Before you submit
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
            <li>· No cuts, no edits, no clicks between the start and the end of the run.</li>
            <li>· Raw footage or a full uncut recording only — highlight reels get rejected.</li>
            <li>· One claim per level per kind; duplicates are rejected automatically.</li>
            <li>· Fake records get your account banned from submitting.</li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Submissions are reviewed by moderators. You will see the decision on
            your profile.
          </p>
          <SubmitButton />
        </div>
      </fieldset>
    </form>
  );
}
