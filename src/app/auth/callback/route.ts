import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Supabase redirects here after Discord has authorised the user.
 * Exchanges the one-time code for a session cookie, then forwards the user on.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"), "/");
  const errorDescription =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[schemonlist] code exchange failed:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
