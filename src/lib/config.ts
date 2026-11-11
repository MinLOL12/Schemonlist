// Central place for environment-driven configuration.
//
// Demo mode exists so the project can be opened and explored before Supabase is
// configured: data lives in memory and disappears on restart. It is never
// enabled automatically in a production build — production without Supabase
// credentials shows a "setup required" screen instead of fake data.

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabaseUrl = rawUrl.replace(/\/+$/, "");
export const supabaseAnonKey = rawAnonKey;
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const forceDemo = process.env.SCHEMONLIST_DEMO === "1";
const demoAllowed = process.env.NODE_ENV !== "production" || forceDemo;

export const demoMode = !supabaseConfigured && demoAllowed;
export const setupRequired = !supabaseConfigured && !demoAllowed;

export const demoCookieName = "schemonlist_demo_user";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
).replace(/\/+$/, "");
