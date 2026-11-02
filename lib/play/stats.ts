import "server-only";
import { weeklyStreak } from "@/lib/gamification/streaks";
import { createAdminClient } from "@/lib/supabase/server";

export async function loadStats(studentId: string, weeklyGoal: number) {
  const db = createAdminClient();
  const since = new Date(Date.now() - 12 * 7 * 86_400_000).toISOString();
  const [events, due, badges, mastery] = await Promise.all([
    db.from("xp_events").select("created_at").eq("student_id", studentId).gte("created_at", since),
    db
      .from("retry_queue")
      .select("variant_group", { count: "exact", head: true })
      .eq("student_id", studentId)
      .lte("due_at", new Date().toISOString()),
    db.from("student_badges").select("earned_at, badges(name, description, icon)").eq("student_id", studentId).order("earned_at"),
    db.from("skill_mastery").select("level, skills(slug, name, track_id)").eq("student_id", studentId),
  ]);
  const streak = weeklyStreak(
    (events.data ?? []).map((e) => new Date(e.created_at)),
    weeklyGoal,
    new Date(),
  );
  return {
    streak,
    warmupDue: due.count ?? 0,
    badges: (badges.data ?? []).map((b) => ({ ...(b.badges as unknown as { name: string; description: string }), earned_at: b.earned_at })),
    mastery: (mastery.data ?? []).map((m) => ({ level: m.level, ...(m.skills as unknown as { slug: string; name: string; track_id: string }) })),
  };
}
