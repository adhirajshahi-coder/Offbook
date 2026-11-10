import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  supabasePublishableKey,
  supabaseSecretKey,
  supabaseUrl,
} from "@/lib/env";

/** Supabase client acting as the signed-in user. RLS applies. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
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
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Anonymous client with no cookies, for public data (zones, plans, policies).
 * Reading no cookies lets marketing pages render statically and stay fast.
 */
export function createPublicClient() {
  return createPlainClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client. Bypasses RLS: use only in trusted server code
 * (webhooks, seed scripts, admin actions that also write the audit log).
 */
export function createAdminClient() {
  return createPlainClient(supabaseUrl, supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
