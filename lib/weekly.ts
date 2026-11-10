import "server-only";
import { sendEmail } from "@/lib/email";
import { weeklySummaryEmail, type WeeklyChild } from "@/lib/email-templates";
import { istDay, istWeekStart } from "@/lib/gamification/streaks";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Weekly progress summary (PRD §7.11): lessons done, goal days, skills
 * mastered and an "ask your child about" prompt. Shown in the Parent Zone
 * and emailed once a week to parents who keep weekly updates on.
 */

type Db = ReturnType<typeof createAdminClient>;

const addDays = (ymd: string, n: number) => new Date(new Date(`${ymd}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export async function childWeek(db: Db, child: { id: string; display_name: string; weekly_goal: number }, weekStart: string): Promise<WeeklyChild> {
  const from = `${weekStart}T00:00:00+05:30`;
  const to = `${addDays(weekStart, 7)}T00:00:00+05:30`;
  const [{ data: lessons }, { data: xp }, { data: mastered }] = await Promise.all([
    db.from("lesson_progress").select("completed_at, lessons(title)").eq("student_id", child.id).gte("completed_at", from).lt("completed_at", to).order("completed_at", { ascending: false }),
    db.from("xp_events").select("created_at").eq("student_id", child.id).gte("created_at", from).lt("created_at", to),
    db.from("skill_mastery").select("level, last_practiced_at, skills(name)").eq("student_id", child.id).eq("level", 3).gte("last_practiced_at", from).lt("last_practiced_at", to),
  ]);
  return {
    name: child.display_name,
    lessons: (lessons ?? []).length,
    activeDays: new Set((xp ?? []).map((e) => istDay(new Date(e.created_at)))).size,
    goal: child.weekly_goal,
    mastered: (mastered ?? []).map((m) => (m.skills as unknown as { name: string }).name).slice(0, 3),
    askAbout: (lessons?.[0]?.lessons as unknown as { title: string } | null)?.title ?? null,
  };
}

/** Email last week's summary to every parent who wants it. Idempotent per parent per week. */
export async function runWeeklySummaries(now = new Date()) {
  const db = createAdminClient();
  const weekStart = addDays(istWeekStart(now), -7);
  const [{ data: parents }, { data: staff }] = await Promise.all([db.from("parents").select("id, name, email, notification_prefs"), db.from("staff").select("id")]);
  const staffIds = new Set((staff ?? []).map((s) => s.id));
  let sent = 0;
  let skipped = 0;
  for (const p of parents ?? []) {
    const prefs = (p.notification_prefs ?? {}) as { weekly_summary?: boolean };
    if (!p.email || staffIds.has(p.id) || prefs.weekly_summary === false) continue;
    const { data: kids } = await db.from("students").select("id, display_name, weekly_goal").eq("parent_id", p.id).eq("status", "active").is("deleted_at", null);
    if (!kids?.length) continue;
    const children = await Promise.all(kids.map((k) => childWeek(db, k, weekStart)));
    // Nothing happened all week: skip rather than send an empty report.
    if (children.every((c) => c.lessons === 0 && c.activeDays === 0)) {
      skipped++;
      continue;
    }
    const { error } = await db.from("automation_log").insert({ key: `weekly-summary:${p.id}:${weekStart}` });
    if (error) continue;
    const weekOf = new Date(`${weekStart}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
    await sendEmail({ to: p.email, ...weeklySummaryEmail({ parentName: p.name, weekOf, children }) });
    sent++;
  }
  return { week: weekStart, sent, skipped };
}
