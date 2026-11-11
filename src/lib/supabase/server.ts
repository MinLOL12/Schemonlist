import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { supabaseAnonKey, supabaseUrl } from "@/lib/config";

/**
 * Request-scoped Supabase client that uses the visitor's auth cookies.
 * All queries are subject to Row Level Security — this client can only do what
 * the signed-in user is allowed to do.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The middleware refreshes the session cookies, so this is safe.
        }
      },
    },
  });
});
