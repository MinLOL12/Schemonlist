"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { deleteLevel, makeSlug, saveLevel } from "@/lib/mutations";
import { validateLevelForm, text } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function saveLevelAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return { status: "error", message: "Only administrators can edit levels." };
  }

  const levelId = text(formData.get("id"), 64) || undefined;
  const { input, errors } = validateLevelForm(formData, makeSlug);

  if (!input) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: errors,
    };
  }

  const result = await saveLevel(input, levelId);
  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePath("/");
  revalidatePath("/list");
  revalidatePath("/leaderboard");
  revalidatePath("/admin/levels");
  if (levelId) revalidatePath(`/levels/${input.slug}`);
  revalidatePath("/admin/audit");

  redirect(
    `/admin/levels?message=${encodeURIComponent(
      levelId ? `Saved “${input.name}”.` : `Created “${input.name}”.`
    )}`
  );
}

export async function deleteLevelAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/?error=forbidden");

  const levelId = text(formData.get("level_id"), 64);
  if (!levelId) {
    redirect(`/admin/levels?error=${encodeURIComponent("Missing level id.")}`);
  }

  const result = await deleteLevel(levelId);
  revalidatePath("/");
  revalidatePath("/list");
  revalidatePath("/leaderboard");
  revalidatePath("/admin/levels");
  revalidatePath("/admin/audit");

  redirect(
    `/admin/levels?${result.ok ? "message" : "error"}=${encodeURIComponent(
      result.ok ? "Level deleted." : result.error
    )}`
  );
}
