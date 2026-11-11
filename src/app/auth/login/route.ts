import { NextResponse } from "next/server";

import { supabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * Starts the Discord OAuth flow. We do this in a route handler (instead of a
 * server action) because Supabase needs to write PKCE cookies to the response.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeNext(requestUrl.searchParams.get("next"), "/");

  if (!supabaseConfigured) {
    return NextResponse.redirect(new URL("/login?error=not_configured", requestUrl.origin));
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || requestUrl.origin;
  const redirectTo = `${origin.replace(/\/+$/, "")}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo,
      scopes: "identify email",
    },
  });

  if (error || !data?.url) {
    console.error("[schemonlist] Discord sign-in failed:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_start", requestUrl.origin));
  }

  return NextResponse.redirect(data.url);
}

export const runtime = "nodejs";
