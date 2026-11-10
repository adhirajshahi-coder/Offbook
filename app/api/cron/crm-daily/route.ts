import { NextResponse, type NextRequest } from "next/server";
import { cronGuard } from "@/lib/cron";
import { recordCronRun } from "@/lib/monitoring";
import { runDailyAutomations } from "@/lib/crm/automations";

/**
 * Daily CRM automations (PRD §12.8): family deals and renewals, renewal
 * reminders, pilot feedback tasks, inactive-student flags, review SLA
 * alerts. Call once a day (e.g. 09:00 IST) with `Authorization: Bearer $CRON_SECRET`.
 */
async function handle(request: NextRequest) {
  const denied = cronGuard(request);
  if (denied) return denied;
  const report = await runDailyAutomations();
  await recordCronRun("crm-daily", report);
  return NextResponse.json(report);
}

export const GET = handle;
export const POST = handle;
