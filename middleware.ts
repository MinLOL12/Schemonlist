import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  demoCookieName,
  demoMode,
  supabaseAnonKey,
  supabaseConfigured,
  supabaseUrl,
} from "@/lib/config";

const PROTECTED_PREFIXES = ["/submit", "/profile", "/admin"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(target)}`;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Demo mode: a simple cookie stands in for a real session.
  if (!supabaseConfigured) {
    if (demoMode && isProtected(pathname) && !request.cookies.get(demoCookieName)) {
      return loginRedirect(request);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  let hasUser = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    hasUser = Boolean(user);
  } catch (error) {
    // Supabase unreachable/misconfigured: fail closed on protected routes.
    console.error("[schemonlist] middleware session lookup failed:", error);
  }

  if (!hasUser && isProtected(pathname)) {
    return loginRedirect(request);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimisation, so the
     * Supabase session cookie stays fresh on normal page views.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)",
  ],
};
