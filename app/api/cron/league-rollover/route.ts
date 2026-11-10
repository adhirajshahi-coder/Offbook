import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/lib/cron";
import { recordCronRun } from "@/lib/monitoring";
import { rollover } from "@/lib/play/league";

/**
 * Weekly league rollover (PRD §7.8). Call every Monday just after 00:00 IST
 * (Sunday 18:30 UTC) with `Authorization: Bearer $CRON_SECRET`, e.g. from a
 * Vercel cron or Supabase scheduled function. Idempotent.
 */
async function handle(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  const report = await rollover();
  await recordCronRun("league-rollover", report);
  return NextResponse.json(report);
}

export const GET = handle;
export const POST = handle;
