import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

/** Uptime check (PRD §17): 200 when the app and database respond, 503 otherwise. No secrets or data. */
export async function GET() {
  const started = Date.now();
  let db: "ok" | "down" | "missing" = "missing";
  if (isSupabaseConfigured()) {
    const { error } = await createAdminClient().from("plans").select("id", { count: "exact", head: true });
    db = error ? "down" : "ok";
  }
  const ok = db === "ok";
  return NextResponse.json({ ok, db, ms: Date.now() - started, time: new Date().toISOString() }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
