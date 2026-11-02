/**
 * Environment access. Integrations read their keys here so a missing key
 * shows a clear "not configured" state instead of crashing unrelated pages.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

/** Server-only secret. Never import this into client components. */
export function supabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return key;
}

export function studentSessionSecret(): string {
  const secret = process.env.STUDENT_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("STUDENT_SESSION_SECRET must be set (32+ characters)");
  }
  return secret;
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Development-only sign-in as seeded users, for QA without email codes. */
export function isDevLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEV_LOGIN === "true"
  );
}
