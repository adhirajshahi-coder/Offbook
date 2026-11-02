import "server-only";
import { onCorrect, onMiss } from "@/lib/gamification/leitner";
import { levelForXp, rankForCompletedCourses } from "@/lib/gamification/xp";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Progress writes. Only called from Play server actions after the student
 * session and unlock checks pass.
 */

type Db = ReturnType<typeof createAdminClient>;

/** Award XP once per (source_type, source_id). Returns the amount actually added. */
export async function awardXp(db: Db, studentId: string, sourceType: string, sourceId: string, amount: number): Promise<number> {
  if (amount <= 0) return 0;
  const { error } = await db.from("xp_events").insert({ student_id: studentId, source_type: sourceType, source_id: sourceId, amount });
  if (error) {
    if (error.code === "23505") return 0; // already awarded
    throw new Error(error.message);
  }
  return amount;
}

/** Recompute the cached xp/level/rank on the student from the ledger (PRD §7.8). */
export async function refreshTotals(db: Db, studentId: string) {
  const [{ data: events }, { count: completed }] = await Promise.all([
    db.from("xp_events").select("amount").eq("student_id", studentId),
    db.from("course_progress").select("course_id", { count: "exact", head: true }).eq("student_id", studentId).eq("status", "completed"),
  ]);
  const xp = (events ?? []).reduce((n, e) => n + e.amount, 0);
  const { level } = levelForXp(xp);
  const rank = rankForCompletedCourses(completed ?? 0);
  const { data: before } = await db.from("students").select("level, rank").eq("id", studentId).single();
  await db.from("students").update({ xp, level, rank }).eq("id", studentId);
  return { xp, level, rank, levelledUp: before ? level > before.level : false, rankedUp: before ? rank !== before.rank : false };
}

const MASTERY_THRESHOLDS = [2, 4, 6]; // correct answers for familiar, proficient, mastered

/** Log an attempt, update the Retry Vault and skill mastery. */
export async function recordAttempt(
  db: Db,
  input: {
    studentId: string;
    question: { id: string; variant_group: string | null; skill_id: string | null };
    context: "lesson" | "quiz" | "boss" | "warmup";
    correct: boolean;
    hintsUsed: number;
    ms?: number;
  },
) {
  const now = new Date();
  const logAttempt = db.from("question_attempts").insert({
    student_id: input.studentId,
    question_id: input.question.id,
    context: input.context,
    correct: input.correct,
    hints_used: input.hintsUsed,
    ms: input.ms ?? null,
  });

  const group = input.question.variant_group;
  const updateVault = (async () => {
    if (group) {
      if (!input.correct) {
        const e = onMiss(now);
        await db.from("retry_queue").upsert(
          { student_id: input.studentId, variant_group: group, box: e.box, due_at: e.dueAt.toISOString(), updated_at: now.toISOString() },
          { onConflict: "student_id,variant_group" },
        );
      } else if (input.context === "warmup") {
        const { data: entry } = await db
          .from("retry_queue")
          .select("box")
          .eq("student_id", input.studentId)
          .eq("variant_group", group)
          .maybeSingle();
        if (entry) {
          const next = onCorrect(entry, now);
          if (next) {
            await db
              .from("retry_queue")
              .update({ box: next.box, due_at: next.dueAt.toISOString(), updated_at: now.toISOString() })
              .eq("student_id", input.studentId)
              .eq("variant_group", group);
          } else {
            await db.from("retry_queue").delete().eq("student_id", input.studentId).eq("variant_group", group);
          }
        }
      }
    }
  })();

  const updateMastery = (async () => {
    if (input.question.skill_id) {
      const { data: m } = await db
        .from("skill_mastery")
        .select("correct_count")
        .eq("student_id", input.studentId)
        .eq("skill_id", input.question.skill_id)
        .maybeSingle();
      const correctCount = (m?.correct_count ?? 0) + (input.correct ? 1 : 0);
      const level = MASTERY_THRESHOLDS.filter((t) => correctCount >= t).length;
      await db.from("skill_mastery").upsert(
        {
          student_id: input.studentId,
          skill_id: input.question.skill_id,
          correct_count: correctCount,
          level,
          last_practiced_at: now.toISOString(),
        },
        { onConflict: "student_id,skill_id" },
      );
    }
  })();

  // Independent writes: run them together.
  await Promise.all([logAttempt, updateVault, updateMastery]);
}

/** Award any badges whose rules are now met. Returns the names of new ones. */
export async function checkBadges(db: Db, studentId: string): Promise<string[]> {
  const [{ data: badges }, { data: have }] = await Promise.all([
    db.from("badges").select("id, name, rule"),
    db.from("student_badges").select("badge_id").eq("student_id", studentId),
  ]);
  const owned = new Set((have ?? []).map((b) => b.badge_id));
  const earned: string[] = [];

  const counts: Record<string, () => Promise<number>> = {
    lessons_completed: async () =>
      (await db.from("lesson_progress").select("lesson_id", { count: "exact", head: true }).eq("student_id", studentId).not("completed_at", "is", null)).count ?? 0,
    missions_completed: async () =>
      (await db.from("mission_progress").select("mission_id", { count: "exact", head: true }).eq("student_id", studentId).not("completed_at", "is", null)).count ?? 0,
    bounce_backs: async () =>
      (await db.from("xp_events").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("source_type", "bounce_back")).count ?? 0,
    warmups: async () =>
      (await db.from("xp_events").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("source_type", "warmup")).count ?? 0,
  };

  for (const b of badges ?? []) {
    if (owned.has(b.id)) continue;
    const rule = b.rule as { metric?: string; gte?: number };
    const metric = rule.metric && counts[rule.metric];
    if (!metric) continue;
    if ((await metric()) >= (rule.gte ?? 1)) {
      const { error } = await db.from("student_badges").insert({ student_id: studentId, badge_id: b.id });
      if (!error) earned.push(b.name);
    }
  }
  return earned;
}
