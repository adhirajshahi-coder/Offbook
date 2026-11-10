import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/lib/cron";
import { recordCronRun } from "@/lib/monitoring";
import { runWeeklySummaries } from "@/lib/weekly";

/**
 * Weekly parent summary email (PRD §7.11). Call on Monday mornings (e.g. 08:00
 * IST) with `Authorization: Bearer $CRON_SECRET`. Covers the week just ended.
 */
async function handle(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  const report = await runWeeklySummaries();
  await recordCronRun("weekly-summary", report);
  return NextResponse.json(report);
}

export const GET = handle;
export const POST = handle;
