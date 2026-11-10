import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * First-party error tracking and job heartbeats (PRD §17). Swap in Sentry
 * later by changing this one module. Nothing personal is stored: query
 * strings are dropped and messages are capped.
 */

const clean = (s: string | undefined | null, max: number) => (s ?? "").replace(/[\r\n]+/g, " ").slice(0, max);
export const stripQuery = (path: string | undefined | null) => clean((path ?? "").split("?")[0], 200);

export async function logError(e: { source: "server" | "client"; message: string; digest?: string | null; path?: string | null; route?: string | null; kind?: string | null }) {
  try {
    await createAdminClient()
      .from("error_events")
      .insert({ source: e.source, message: clean(e.message, 500) || "Unknown error", digest: e.digest ? clean(e.digest, 60) : null, path: stripQuery(e.path), route: clean(e.route, 200) || null, kind: clean(e.kind, 40) || null });
  } catch {
    // Monitoring must never break the request.
  }
}

/** Heartbeat for scheduled jobs, shown on HQ → Settings → System. */
export async function recordCronRun(name: string, report: unknown) {
  try {
    await createAdminClient().from("crm_state").upsert({ key: `cron:${name}`, value: { at: new Date().toISOString(), report }, updated_at: new Date().toISOString() });
  } catch {
    // Non-fatal.
  }
}
