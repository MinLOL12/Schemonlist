"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateProfileAction } from "@/actions/auth";
import { Notice } from "@/components/notice";
import type { ActionResult } from "@/lib/types";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function ProfileSettingsForm({
  username,
  displayName,
}: {
  username: string;
  displayName: string | null;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(updateProfileAction, {
    status: "idle",
  });

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" ? (
        <Notice variant="error">{state.message}</Notice>
      ) : null}
      {state.status === "success" ? (
        <Notice variant="success">{state.message}</Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className="label">Username</label>
          <input
            id="username"
            name="username"
            defaultValue={username}
            className="input"
            required
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_.\-]{3,24}"
            title="3-24 characters: letters, numbers, underscore, dot or dash"
          />
          <p className="hint">Used in your profile URL. Must be unique.</p>
        </div>
        <div>
          <label htmlFor="display_name" className="label">Display name</label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={displayName ?? ""}
            className="input"
            maxLength={48}
            placeholder="Optional"
          />
          <p className="hint">Shown on your profile and on the leaderboard.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
