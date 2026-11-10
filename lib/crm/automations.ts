import "server-only";
import { sendEmail } from "@/lib/email";
import { inactiveNudgeEmail, renewalReminderEmail, reviewAlertEmail } from "@/lib/email-templates";
import { SLA_ALERT_HOURS } from "@/lib/hq/review";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * CRM automations (PRD §12.8), run daily by /api/cron/crm-daily and on
 * demand from HQ. Every rule is idempotent: deals and tasks carry an
 * automation_key, emails are logged in automation_log.
 */

type Db = ReturnType<typeof createAdminClient>;
const DAY = 86_400_000;

export const PILOT_FEEDBACK_DAYS = 14;
export const RENEWAL_WINDOW_DAYS = 30;
export const INACTIVE_DAYS = 7;

/** True the first time a key is seen; the log makes every email send once. */
async function once(db: Db, key: string): Promise<boolean> {
  const { error } = await db.from("automation_log").insert({ key });
  return !error;
}

type Stage = { id: string; name: string; order_index: number };

async function pipelineStages(db: Db, slug: string) {
  const { data } = await db.from("pipelines").select("id, pipeline_stages(id, name, order_index)").eq("slug", slug).single();
  const stages = ((data?.pipeline_stages ?? []) as Stage[]).sort((a, b) => a.order_index - b.order_index);
  const byName = (n: string) => stages.find((s) => s.name.toLowerCase().startsWith(n.toLowerCase()));
  return { pipelineId: data?.id as string, stages, byName };
}

// ---------------------------------------------------------------------------
// Families: one deal per family that follows the product, plus renewals
// ---------------------------------------------------------------------------

export async function syncFamilies(db: Db, now: Date) {
  const fam = await pipelineStages(db, "families");
  const [{ data: parents }, { data: staff }, { data: subs }, { data: kids }] = await Promise.all([
    db.from("parents").select("id, name, email, created_at"),
    db.from("staff").select("id"),
    db.from("subscriptions").select("id, parent_id, student_id, status, starts_at, ends_at, amount_paise, renewal_reminders, students(display_name)"),
    db.from("students").select("id, parent_id").is("deleted_at", null),
  ]);
  const staffIds = new Set((staff ?? []).map((s) => s.id));
  const families = (parents ?? []).filter((p) => !staffIds.has(p.id));
  if (families.length) {
    await db.from("families").upsert(families.map((p) => ({ parent_id: p.id })), { onConflict: "parent_id", ignoreDuplicates: true });
  }

  const { data: deals } = await db.from("deals").select("id, stage_id, automation_key").like("automation_key", "family:%");
  const dealByKey = new Map((deals ?? []).map((d) => [d.automation_key, d]));
  const order = new Map(fam.stages.map((s) => [s.id, s.order_index]));
  const managedLater = new Set([fam.byName("Renewal due")?.id, fam.byName("Renewed")?.id, fam.byName("Lost")?.id]);
  let moved = 0;
  let created = 0;

  for (const p of families) {
    const mine = (subs ?? []).filter((s) => s.parent_id === p.id);
    const active = mine.filter((s) => s.status === "active" && s.ends_at && new Date(s.ends_at) > now);
    const hasKids = (kids ?? []).some((k) => k.parent_id === p.id);
    const settled = active.some((s) => s.starts_at && now.getTime() - new Date(s.starts_at).getTime() >= 30 * DAY);
    const target = settled ? fam.byName("Active") : active.length ? fam.byName("Paid") : hasKids ? fam.byName("Trial") : fam.byName("Signed up");
    if (!target) continue;
    const value = active.reduce((n, s) => n + s.amount_paise, 0);
    const key = `family:${p.id}`;
    const deal = dealByKey.get(key);
    if (!deal) {
      await db.from("deals").insert({
        pipeline_id: fam.pipelineId,
        stage_id: target.id,
        title: `${p.name ?? p.email ?? "Family"}`.slice(0, 160),
        family_parent_id: p.id,
        value_paise: value,
        source: "signup",
        automation_key: key,
      });
      created++;
    } else if (!managedLater.has(deal.stage_id) && (order.get(target.id) ?? 0) > (order.get(deal.stage_id) ?? 0)) {
      // Only ever move forward; staff can move deals back by hand.
      await db.from("deals").update({ stage_id: target.id, value_paise: value }).eq("id", deal.id);
      moved++;
    }
  }

  // Renewals: a deal 30 days before a plan ends; reminders at 14 and 7 days.
  const renewalDue = fam.byName("Renewal due");
  const renewed = fam.byName("Renewed");
  const lost = fam.byName("Lost");
  let renewals = 0;
  let reminders = 0;
  const parentEmail = new Map(families.map((p) => [p.id, p]));
  for (const s of subs ?? []) {
    if (!s.ends_at || !renewalDue || !renewed || !lost) continue;
    const ends = new Date(s.ends_at);
    const daysLeft = Math.ceil((ends.getTime() - now.getTime()) / DAY);
    const next = (subs ?? []).find((o) => o.student_id === s.student_id && o.id !== s.id && o.status === "active" && o.starts_at && new Date(o.starts_at) >= new Date(ends.getTime() - DAY));
    const key = `renewal:${s.id}`;
    const { data: existing } = await db.from("deals").select("id, status").eq("automation_key", key).maybeSingle();
    const child = (s.students as unknown as { display_name: string } | null)?.display_name ?? "your child";

    if (s.status === "active" && daysLeft <= RENEWAL_WINDOW_DAYS && daysLeft > 0 && !next && !existing) {
      await db.from("deals").insert({
        pipeline_id: fam.pipelineId,
        stage_id: renewalDue.id,
        title: `Renewal: ${child}`,
        family_parent_id: s.parent_id,
        subscription_id: s.id,
        value_paise: s.amount_paise,
        expected_close: s.ends_at.slice(0, 10),
        source: "renewal",
        automation_key: key,
      });
      renewals++;
    }
    if (existing?.status === "open" && next) await db.from("deals").update({ stage_id: renewed.id }).eq("id", existing.id);
    if (existing?.status === "open" && !next && daysLeft <= 0) await db.from("deals").update({ stage_id: lost.id, lost_reason: "Plan ended without renewal" }).eq("id", existing.id);

    const parent = parentEmail.get(s.parent_id);
    if (s.status === "active" && s.renewal_reminders && !next && parent?.email) {
      const mark = daysLeft <= 7 && daysLeft > 0 ? 7 : daysLeft <= 14 && daysLeft > 7 ? 14 : null;
      if (mark && (await once(db, `renewal-reminder:${s.id}:${mark}`))) {
        await sendEmail({
          to: parent.email,
          ...renewalReminderEmail({ parentName: parent.name, childName: child, daysLeft, endsOn: ends.toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" }) }),
        });
        reminders++;
      }
    }
  }
  return { families: families.length, created, moved, renewals, reminders };
}


// ---------------------------------------------------------------------------
// Schools: pilots running too long without feedback
// ---------------------------------------------------------------------------

export async function pilotFeedbackTasks(db: Db, now: Date) {
  const sch = await pipelineStages(db, "schools");
  const running = sch.byName("Pilot running");
  if (!running) return { tasks: 0 };
  const cutoff = new Date(now.getTime() - PILOT_FEEDBACK_DAYS * DAY).toISOString();
  const { data: deals } = await db.from("deals").select("id, owner_id, contact_id, organization_id, stage_changed_at").eq("stage_id", running.id).lte("stage_changed_at", cutoff);
  let tasks = 0;
  for (const d of deals ?? []) {
    const { error } = await db.from("activities").insert({
      type: "task",
      subject: "Collect pilot feedback",
      body: `The pilot has been running for ${PILOT_FEEDBACK_DAYS}+ days. Ask the coordinator what's working, and share the cohort report.`,
      due_at: new Date(now.getTime() + 2 * DAY).toISOString(),
      owner_id: d.owner_id,
      deal_id: d.id,
      contact_id: d.contact_id,
      organization_id: d.organization_id,
      automation_key: `pilot-feedback:${d.id}:${d.stage_changed_at.slice(0, 10)}`,
    });
    if (!error) tasks++;
  }
  return { tasks };
}

// ---------------------------------------------------------------------------
// Students inactive for 7 days: flag the family, send one supportive note
// ---------------------------------------------------------------------------

export async function inactiveStudents(db: Db, now: Date) {
  const since = new Date(now.getTime() - INACTIVE_DAYS * DAY).toISOString();
  const [{ data: subs }, { data: recent }] = await Promise.all([
    db.from("subscriptions").select("student_id, parent_id, starts_at, students(display_name, status)").eq("status", "active").gt("ends_at", now.toISOString()),
    db.from("xp_events").select("student_id").gte("created_at", since),
  ]);
  const activeIds = new Set((recent ?? []).map((r) => r.student_id));
  const atRiskParents = new Map<string, string[]>();
  for (const s of subs ?? []) {
    const st = s.students as unknown as { display_name: string; status: string } | null;
    if (!st || st.status !== "active") continue;
    if (s.starts_at && new Date(s.starts_at).toISOString() > since) continue; // new this week
    if (activeIds.has(s.student_id)) continue;
    atRiskParents.set(s.parent_id, [...(atRiskParents.get(s.parent_id) ?? []), st.display_name]);
  }

  const { data: flagged } = await db.from("families").select("parent_id").eq("at_risk", true);
  const clear = (flagged ?? []).map((f) => f.parent_id).filter((id) => !atRiskParents.has(id));
  if (clear.length) await db.from("families").update({ at_risk: false, at_risk_since: null }).in("parent_id", clear);

  let emails = 0;
  const week = now.toISOString().slice(0, 10);
  for (const [parentId, names] of atRiskParents) {
    await db.from("families").upsert({ parent_id: parentId }, { onConflict: "parent_id", ignoreDuplicates: true });
    await db.from("families").update({ at_risk: true, at_risk_since: now.toISOString() }).eq("parent_id", parentId).eq("at_risk", false);
    const { data: parent } = await db.from("parents").select("email, name, notification_prefs").eq("id", parentId).single();
    const prefs = (parent?.notification_prefs ?? {}) as { weekly_summary?: boolean };
    if (!parent?.email || prefs.weekly_summary === false) continue;
    // One note per family per inactive stretch (keyed on the at-risk start week).
    const { data: fam } = await db.from("families").select("at_risk_since").eq("parent_id", parentId).single();
    if (!(await once(db, `inactive:${parentId}:${(fam?.at_risk_since ?? week).slice(0, 10)}`))) continue;
    const who = names.join(" and ");
    await sendEmail({ to: parent.email, ...inactiveNudgeEmail({ parentName: parent.name, childNames: who }) });
    emails++;
  }
  return { atRisk: atRiskParents.size, cleared: clear.length, emails };
}

// ---------------------------------------------------------------------------
// Capstones waiting over 36 hours: alert reviewers
// ---------------------------------------------------------------------------

export async function capstoneAlerts(db: Db, now: Date) {
  const cutoff = new Date(now.getTime() - SLA_ALERT_HOURS * 3_600_000).toISOString();
  const { data: late } = await db.from("submissions").select("id").eq("status", "pending").in("kind", ["capstone", "challenge"]).lte("created_at", cutoff);
  const fresh: string[] = [];
  for (const s of late ?? []) if (await once(db, `sla-alert:${s.id}`)) fresh.push(s.id);
  if (!fresh.length) return { alerted: 0 };
  const { data: reviewers } = await db.from("staff").select("id").eq("active", true).in("role", ["reviewer", "ops", "admin"]);
  for (const r of reviewers ?? []) {
    const { data } = await db.auth.admin.getUserById(r.id);
    if (!data.user?.email) continue;
    await sendEmail({ to: data.user.email, ...reviewAlertEmail({ count: fresh.length, hours: SLA_ALERT_HOURS }) });
  }
  return { alerted: fresh.length };
}

export async function runDailyAutomations(now = new Date()) {
  const db = createAdminClient();
  const families = await syncFamilies(db, now);
  const [pilots, inactive, sla] = await Promise.all([pilotFeedbackTasks(db, now), inactiveStudents(db, now), capstoneAlerts(db, now)]);
  return { ranAt: now.toISOString(), families, pilots, inactive, sla };
}
