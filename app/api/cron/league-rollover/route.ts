import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/lib/cron";
import { rollover } from "@/lib/play/league";

/**
 * Weekly league rollover (PRD §7.8). Call every Monday just after 00:00 IST
 * (Sunday 18:30 UTC) with `Authorization: Bearer $CRON_SECRET`, e.g. from a
 * Vercel cron or Supabase scheduled function. Idempotent.
 */
async function handle(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  return NextResponse.json(await rollover());
}

export const GET = handle;
export const POST = handle;
