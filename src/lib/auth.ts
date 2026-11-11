import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { demoCookieName, demoMode, supabaseConfigured } from "@/lib/config";
import { demoData } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types";

/**
 * The signed-in user (or null). Cached per request so a page with a layout,
 * header and several data calls only talks to GoTrue once.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (demoMode) {
    const store = await cookies();
    const id = store.get(demoCookieName)?.value;
    if (!id) return null;
    const profile = demoData().profiles.find((p) => p.id === id);
    if (!profile) return null;
    return {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      role: profile.role,
      is_banned: Boolean(profile.is_banned),
    };
  }

  // Production build without credentials: there is nothing to authenticate.
  if (!supabaseConfigured) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, is_banned")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      return {
        id: profile.id as string,
        username: profile.username as string,
        display_name: (profile.display_name as string) ?? null,
        avatar_url: (profile.avatar_url as string) ?? null,
        role: profile.role as SessionUser["role"],
        is_banned: Boolean(profile.is_banned),
      };
    }

    // Profile row not created yet (auth trigger not installed). Degrade safely.
    return {
      id: user.id,
      username: (user.user_metadata?.preferred_username as string) ?? "player",
      display_name: (user.user_metadata?.full_name as string) ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
      role: "player",
      is_banned: false,
    };
  } catch (error) {
    console.error("[schemonlist] getSessionUser failed:", error);
    return null;
  }
});

export async function requireUser(nextPath = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireStaff(nextPath = "/admin"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.role !== "admin" && user.role !== "moderator") {
    redirect("/?error=forbidden");
  }
  return user;
}

export async function requireAdmin(nextPath = "/admin"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.role !== "admin") {
    // Moderators still have the review queue; send them somewhere useful.
    redirect(user.role === "moderator" ? "/admin?error=forbidden" : "/?error=forbidden");
  }
  return user;
}

export function isStaff(user: SessionUser | null): boolean {
  return user?.role === "admin" || user?.role === "moderator";
}
