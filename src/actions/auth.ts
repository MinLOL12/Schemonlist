"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { demoCookieName, demoMode } from "@/lib/config";
import { demoData } from "@/lib/demo/store";
import { getSessionUser } from "@/lib/auth";
import { updateOwnProfile } from "@/lib/mutations";
import { safeNext } from "@/lib/url";
import type { ActionResult } from "@/lib/types";

export async function signOutUser(): Promise<void> {
  if (demoMode) {
    const store = await cookies();
    store.delete(demoCookieName);
    redirect("/");
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Demo-mode login. Does nothing unless demo mode is active. */
export async function demoSignIn(formData: FormData): Promise<void> {
  if (!demoMode) redirect("/login");
  const id = String(formData.get("persona") ?? "");
  const persona = demoData().profiles.find((p) => p.id === id);
  if (!persona) redirect("/login?error=unknown_persona");

  const store = await cookies();
  store.set(demoCookieName, persona.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
  redirect(safeNext(String(formData.get("next") ?? "/"), "/"));
}

export async function updateProfileAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const username = String(formData.get("username") ?? "").trim();
  const displayNameRaw = String(formData.get("display_name") ?? "").trim();
  const displayName = displayNameRaw.length > 0 ? displayNameRaw.slice(0, 48) : null;

  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) {
    return {
      status: "error",
      message: "Usernames must be 3-24 characters and use only letters, numbers, _ . or -",
    };
  }

  const result = await updateOwnProfile(user.id, username, displayName);
  if (!result.ok) return { status: "error", message: result.error };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile updated." };
}
