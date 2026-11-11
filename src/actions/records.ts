"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";
import { createRecord, deleteRecord, reviewRecord } from "@/lib/mutations";
import { isHttpUrl, text, LIMITS } from "@/lib/validation";
import { safeNext } from "@/lib/url";
import type { ActionResult, RecordKind } from "@/lib/types";

function revalidateRecordViews() {
  revalidatePath("/");
  revalidatePath("/list");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/submissions");
}

export async function submitRecordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { status: "error", message: "Please sign in with Discord before submitting." };
  }

  const levelId = text(formData.get("level_id"), 64);
  const kind = text(formData.get("kind"), 16) as RecordKind;
  const progressRaw = text(formData.get("progress"), 4);
  const videoUrl = text(formData.get("video_url"), LIMITS.url);

  const fieldErrors: Record<string, string> = {};
  if (!levelId) fieldErrors.level_id = "Choose a level.";
  if (kind !== "completion" && kind !== "verification") {
    fieldErrors.kind = "Choose whether you beat or verified the level.";
  }
  const progress = Number(progressRaw || "100");
  if (!Number.isInteger(progress) || progress < 1 || progress > 100) {
    fieldErrors.progress = "Progress must be a whole number between 1 and 100.";
  }
  if (!isHttpUrl(videoUrl)) {
    fieldErrors.video_url = "Paste a full https:// link to your video (YouTube, Twitch, …).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const result = await createRecord(user, {
    level_id: levelId,
    kind,
    progress,
    video_url: videoUrl,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidateRecordViews();
  return {
    status: "success",
    message:
      "Submission received. A moderator will review it — you can track it from your profile.",
  };
}

export async function reviewRecordAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  const recordId = text(formData.get("record_id"), 64);
  const decision = text(formData.get("decision"), 16);
  const note = text(formData.get("note"), LIMITS.note);
  const redirectTo = safeNext(text(formData.get("redirect_to"), 200), "/admin/submissions");

  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    redirect("/?error=forbidden");
  }
  if (!recordId || (decision !== "approved" && decision !== "rejected")) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Invalid review request.")}`);
  }

  const result = await reviewRecord(user, recordId, decision, note || null);
  revalidateRecordViews();
  revalidatePath("/admin/levels");
  revalidatePath("/admin/audit");

  const message = result.ok
    ? `Record ${decision}.`
    : result.error;
  redirect(`${redirectTo}?${result.ok ? "message" : "error"}=${encodeURIComponent(message)}`);
}

export async function deleteRecordAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  const recordId = text(formData.get("record_id"), 64);
  const redirectTo = safeNext(text(formData.get("redirect_to"), 200), "/profile");

  if (!user) redirect("/login?next=%2Fprofile");
  if (!recordId) redirect(`${redirectTo}?error=${encodeURIComponent("Missing record.")}`);

  const result = await deleteRecord(user, recordId);
  revalidateRecordViews();
  const message = result.ok ? "Submission deleted." : result.error;
  redirect(`${redirectTo}?${result.ok ? "message" : "error"}=${encodeURIComponent(message)}`);
}
