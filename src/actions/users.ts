"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { setUserBan, setUserRole } from "@/lib/mutations";
import { text, LIMITS } from "@/lib/validation";
import type { Role } from "@/lib/types";

export async function setRoleAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/?error=forbidden");

  const targetId = text(formData.get("target_id"), 64);
  const role = text(formData.get("role"), 16) as Role;
  if (!targetId || !["player", "moderator", "admin"].includes(role)) {
    redirect(`/admin/users?error=${encodeURIComponent("Invalid role change.")}`);
  }

  const result = await setUserRole(targetId, role);
  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
  revalidatePath("/admin/audit");

  redirect(
    `/admin/users?${result.ok ? "message" : "error"}=${encodeURIComponent(
      result.ok ? "Role updated." : result.error
    )}`
  );
}

export async function setBanAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/?error=forbidden");

  const targetId = text(formData.get("target_id"), 64);
  const banned = text(formData.get("banned"), 8) === "true";
  const reason = text(formData.get("reason"), LIMITS.note) || null;

  if (!targetId) redirect(`/admin/users?error=${encodeURIComponent("Missing account id.")}`);

  const result = await setUserBan(targetId, banned, reason);
  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");

  redirect(
    `/admin/users?${result.ok ? "message" : "error"}=${encodeURIComponent(
      result.ok ? (banned ? "Account banned." : "Account unbanned.") : result.error
    )}`
  );
}
