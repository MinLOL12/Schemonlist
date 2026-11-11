"use client";

import { setBanAction, setRoleAction } from "@/actions/users";

export function RoleForm({ userId, role }: { userId: string; role: string }) {
  return (
    <form action={setRoleAction} className="flex items-center gap-1.5">
      <input type="hidden" name="target_id" value={userId} />
      <select
        name="role"
        defaultValue={role}
        className="rounded-lg border border-white/10 bg-[#070a14] px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-400/60 focus:outline-none"
        aria-label="Account role"
      >
        <option value="player">Player</option>
        <option value="moderator">Moderator</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" className="btn btn-ghost btn-sm">Set</button>
    </form>
  );
}

export function BanControl({
  userId,
  isBanned,
}: {
  userId: string;
  isBanned: boolean;
}) {
  if (isBanned) {
    return (
      <form action={setBanAction}>
        <input type="hidden" name="target_id" value={userId} />
        <input type="hidden" name="banned" value="false" />
        <button type="submit" className="btn btn-success btn-sm">Unban</button>
      </form>
    );
  }

  return (
    <details className="group">
      <summary className="btn btn-danger btn-sm inline-flex cursor-pointer list-none">
        Ban
      </summary>
      <form action={setBanAction} className="mt-2 w-56 space-y-2">
        <input type="hidden" name="target_id" value={userId} />
        <input type="hidden" name="banned" value="true" />
        <input
          name="reason"
          className="input !py-1.5 text-xs"
          placeholder="Reason (stored for admins)"
          maxLength={500}
        />
        <button type="submit" className="btn btn-danger btn-sm w-full">
          Confirm ban
        </button>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Banning rejects all pending submissions from this account.
        </p>
      </form>
    </details>
  );
}
