"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { runDailyAutomations } from "@/lib/crm/automations";
import { CRM_WRITE } from "@/lib/crm/data";
import { audit } from "@/lib/hq/audit";

/** Same job as /api/cron/crm-daily, started by hand from HQ. */
export async function runAutomationsNow() {
  await requireStaff(CRM_WRITE);
  const r = await runDailyAutomations();
  await audit("crm.automations_run", "crm", null, r as unknown as Record<string, unknown>);
  revalidatePath("/hq/crm", "layout");
  return {
    ok: true,
    message: `Synced ${r.families.families} families (${r.families.created} new deals, ${r.families.moved} moved, ${r.families.renewals} renewals) · ${r.pilots.tasks} pilot tasks · ${r.inactive.atRisk} at risk.`,
  };
}
