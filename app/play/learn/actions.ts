"use server";

import { canStartCourse } from "@/lib/gamification/unlocks";
import { XP, practiceStepXp } from "@/lib/gamification/xp";
import { studentOrThrow } from "@/lib/play/session";
import { awardXp, checkBadges, recordAttempt, refreshTotals } from "@/lib/play/progress";
import { courseIdForLesson, courseIdForMission, loadCourse, loadWorld } from "@/lib/play/state";
import { istDay } from "@/lib/gamification/streaks";
import { checkAnswer, isMeaningfulText, toClient, type ClientQuestion, type QuestionRow, type Response } from "@/lib/questions";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Every Play write goes through here. Each action:
 * 1. verifies the child session (parent + signed profile cookie + plan),
 * 2. re-checks unlock state on the server,
 * 3. writes with the service role.
 * The browser never sees answers and can't skip ahead by calling these.
 */

const QUESTION_COLUMNS = "id, type, prompt, options, answer, explanation, hint1, hint2, difficulty, variant_group, skill_id";

export type Celebration = {
  xp: number;
  lessonComplete?: boolean;
  missionComplete?: boolean;
  levelUp?: number;
  badges?: string[];
};

async function assertLessonOpen(lessonId: string) {
  const student = await studentOrThrow();
  const ref = await courseIdForLesson(lessonId);
  if (!ref) throw new Error("Lesson not found");
  const view = await loadCourse(student, ref.courseId);
  if (!view || view.inside.lessons[lessonId] === undefined || view.inside.lessons[lessonId] === "locked") {
    throw new Error("This lesson is still locked");
  }
  return { student, view, ...ref };
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export async function startCourse(courseId: string) {
  const student = await studentOrThrow();
  const world = await loadWorld(student);
  if (!canStartCourse(world.unlock, courseId)) throw new Error("This course is still locked");
  const db = createAdminClient();
  await db.from("course_progress").upsert(
    { student_id: student.id, course_id: courseId, status: "in_progress" },
    { onConflict: "student_id,course_id", ignoreDuplicates: true },
  );
}

// ---------------------------------------------------------------------------
// Practice questions inside a lesson step
// ---------------------------------------------------------------------------

async function stepFor(stepId: string) {
  const db = createAdminClient();
  const { data } = await db.from("lesson_steps").select("id, lesson_id, type, content, order_index").eq("id", stepId).single();
  if (!data) throw new Error("Step not found");
  return data as { id: string; lesson_id: string; type: string; content: Record<string, unknown>; order_index: number };
}

/** A fresh variant from the group, avoiding ones already shown in this sitting. */
async function pickVariant(group: string, exclude: string[]): Promise<QuestionRow | null> {
  const db = createAdminClient();
  const { data } = await db.from("questions").select(QUESTION_COLUMNS).eq("variant_group", group).eq("status", "published");
  const rows = (data ?? []) as QuestionRow[];
  if (rows.length === 0) return null;
  const fresh = rows.filter((r) => !exclude.includes(r.id));
  const pool = fresh.length ? fresh : rows;
  return pool[Math.floor(Math.random() * pool.length)];
}

export type QuestionPayload = { question: ClientQuestion; hint1: string | null; hint2: string | null; group: string };

export async function getStepQuestion(stepId: string, group: string, exclude: string[]): Promise<QuestionPayload> {
  const step = await stepFor(stepId);
  await assertLessonOpen(step.lesson_id);
  const groups = (step.content.groups as string[]) ?? [];
  if (!groups.includes(group)) throw new Error("Not part of this step");
  const q = await pickVariant(group, exclude);
  if (!q) throw new Error("No questions yet");
  return { question: toClient(q), hint1: q.hint1, hint2: q.hint2, group };
}

export type AnswerResult = { correct: boolean; explanation: string };

export async function answerStepQuestion(input: {
  stepId: string;
  questionId: string;
  response: Response;
  hintsUsed: number;
  ms: number;
}): Promise<AnswerResult> {
  const step = await stepFor(input.stepId);
  const { student } = await assertLessonOpen(step.lesson_id);
  const db = createAdminClient();
  const { data: q } = await db.from("questions").select(QUESTION_COLUMNS).eq("id", input.questionId).single();
  if (!q || !((step.content.groups as string[]) ?? []).includes(q.variant_group ?? "")) throw new Error("Not part of this step");
  const correct = checkAnswer(q as QuestionRow, input.response);
  await recordAttempt(db, {
    studentId: student.id,
    question: q as QuestionRow,
    context: "lesson",
    correct,
    hintsUsed: Math.max(0, Math.min(3, input.hintsUsed)),
    ms: Math.max(0, Math.min(3_600_000, input.ms)),
  });
  return { correct, explanation: q.explanation };
}

// ---------------------------------------------------------------------------
// Finishing steps and lessons
// ---------------------------------------------------------------------------

export async function completeStep(input: {
  stepId: string;
  stats?: { mistakes: number; bounceBacks: number; hintsUsed: number };
  text?: string;
}): Promise<Celebration & { error?: string }> {
  const step = await stepFor(input.stepId);
  const db = createAdminClient();
  const [{ student, view, courseId }, { data: steps }] = await Promise.all([
    assertLessonOpen(step.lesson_id),
    db.from("lesson_steps").select("id, type, order_index, content").eq("lesson_id", step.lesson_id).order("order_index"),
  ]);

  // Steps unlock in order: every earlier step must be done.
  const { data: done } = await db
    .from("step_progress")
    .select("step_id, completed_at, attempts")
    .eq("student_id", student.id)
    .in("step_id", (steps ?? []).map((s) => s.id));
  const doneIds = new Set((done ?? []).filter((d) => d.completed_at).map((d) => d.step_id));
  const earlier = (steps ?? []).filter((s) => s.order_index < step.order_index);
  if (earlier.some((s) => !doneIds.has(s.id))) return { xp: 0, error: "Finish the earlier steps first." };

  const firstTime = !doneIds.has(step.id);
  let xp = 0;
  let response: Record<string, unknown> | null = null;

  if (step.type === "practice") {
    // Anti-cheat: each group must have a correct answer on record.
    const groups = (step.content.groups as string[]) ?? [];
    const { data: qs } = await db.from("questions").select("id, variant_group").in("variant_group", groups);
    const { data: wins } = await db
      .from("question_attempts")
      .select("question_id")
      .eq("student_id", student.id)
      .eq("correct", true)
      .in("question_id", (qs ?? []).map((q) => q.id));
    const wonGroups = new Set((qs ?? []).filter((q) => (wins ?? []).some((w) => w.question_id === q.id)).map((q) => q.variant_group));
    if (groups.some((g) => !wonGroups.has(g))) return { xp: 0, error: "Answer each question correctly first." };
    const stats = input.stats ?? { mistakes: 0, bounceBacks: 0, hintsUsed: 0 };
    xp = practiceStepXp({ firstTime, ...stats });
    if (firstTime && stats.bounceBacks > 0) {
      // Zero-XP marker row (the bonus is already in `xp`); counts towards the Bounce-back badge.
      await db.from("xp_events").insert({ student_id: student.id, source_type: "bounce_back", source_id: step.id, amount: 0 });
    }
  } else if (step.type === "make") {
    const text = (input.text ?? "").trim();
    if (!isMeaningfulText(text, 20)) return { xp: 0, error: "Write a little more: at least a couple of real sentences." };
    response = { text: text.slice(0, 2000) };
    if (firstTime) {
      await db.from("submissions").insert({
        student_id: student.id,
        kind: "make",
        course_id: courseId,
        step_id: step.id,
        content: response,
        status: "kept",
      });
    }
    xp = firstTime ? XP.stepFirstTime : 0;
  } else if (step.type === "reflect") {
    const text = (input.text ?? "").trim();
    if (text) response = { text: text.slice(0, 500) };
    xp = firstTime ? XP.stepFirstTime : 0;
  } else {
    xp = firstTime ? XP.stepFirstTime : 0;
  }

  const existing = (done ?? []).find((d) => d.step_id === step.id);
  const [, , , gained] = await Promise.all([
    // Starting the first lesson starts the course.
    view.state === "available"
      ? db
          .from("course_progress")
          .upsert({ student_id: student.id, course_id: courseId, status: "in_progress" }, { onConflict: "student_id,course_id", ignoreDuplicates: true })
      : Promise.resolve(null),
    db
      .from("lesson_progress")
      .upsert({ student_id: student.id, lesson_id: step.lesson_id }, { onConflict: "student_id,lesson_id", ignoreDuplicates: true }),
    db.from("step_progress").upsert(
      {
        student_id: student.id,
        step_id: step.id,
        completed_at: new Date().toISOString(),
        attempts: (existing?.attempts ?? 0) + 1,
        ...(response ? { response } : {}),
      },
      { onConflict: "student_id,step_id" },
    ),
    awardXp(db, student.id, "step", step.id, xp),
  ]);
  const result: Celebration = { xp: gained };

  // Last step done → lesson complete.
  doneIds.add(step.id);
  if ((steps ?? []).every((s) => doneIds.has(s.id))) {
    const { data: lp } = await db
      .from("lesson_progress")
      .select("completed_at")
      .eq("student_id", student.id)
      .eq("lesson_id", step.lesson_id)
      .single();
    if (!lp?.completed_at) {
      await db
        .from("lesson_progress")
        .update({ completed_at: new Date().toISOString() })
        .eq("student_id", student.id)
        .eq("lesson_id", step.lesson_id);
      result.xp += await awardXp(db, student.id, "lesson", step.lesson_id, XP.lessonComplete);
      result.lessonComplete = true;
    }
  }

  const [totals, badges] = await Promise.all([
    refreshTotals(db, student.id),
    result.lessonComplete ? checkBadges(db, student.id) : Promise.resolve([] as string[]),
  ]);
  if (totals.levelledUp) result.levelUp = totals.level;
  if (badges.length) result.badges = badges;
  return result;
}

// ---------------------------------------------------------------------------
// Mission quiz and boss
// ---------------------------------------------------------------------------

export type RoundKind = "quiz" | "boss";

async function assertMissionStage(missionId: string, kind: RoundKind) {
  const student = await studentOrThrow();
  const courseId = await courseIdForMission(missionId);
  if (!courseId) throw new Error("Mission not found");
  const view = await loadCourse(student, courseId);
  const stage = view?.inside.missions[missionId]?.[kind];
  if (!view || !stage || stage === "locked") throw new Error(kind === "quiz" ? "Finish the lessons first" : "Pass the quiz first");
  return { student, view, courseId };
}

async function roundPool(missionId: string, kind: RoundKind, view: Awaited<ReturnType<typeof loadCourse>>): Promise<QuestionRow[]> {
  const db = createAdminClient();
  if (kind === "boss") {
    // Boss questions tell a story in order (Surprise 1, Surprise 2…).
    const { data } = await db
      .from("questions")
      .select(QUESTION_COLUMNS)
      .eq("mission_id", missionId)
      .is("lesson_id", null)
      .eq("status", "published")
      .order("seed_key");
    return (data ?? []) as QuestionRow[];
  }
  // Quiz: one fresh variant from 5 different groups across the mission's lessons.
  const mission = view!.missions.find((m) => m.id === missionId)!;
  const { data } = await db
    .from("questions")
    .select(QUESTION_COLUMNS)
    .in("lesson_id", mission.lessons.map((l) => l.id))
    .eq("status", "published");
  const byGroup = new Map<string, QuestionRow[]>();
  for (const q of (data ?? []) as QuestionRow[]) {
    if (!q.variant_group) continue;
    if (!byGroup.has(q.variant_group)) byGroup.set(q.variant_group, []);
    byGroup.get(q.variant_group)!.push(q);
  }
  const groups = [...byGroup.values()].sort(() => Math.random() - 0.5).slice(0, 5);
  return groups.map((g) => g[Math.floor(Math.random() * g.length)]);
}

export type RoundPayload = {
  title: string;
  intro: string;
  passPct: number;
  questions: { question: ClientQuestion; hint1: string | null; hint2: string | null }[];
};

export async function getRound(missionId: string, kind: RoundKind): Promise<RoundPayload> {
  const { view } = await assertMissionStage(missionId, kind);
  const mission = view.missions.find((m) => m.id === missionId)!;
  const pool = await roundPool(missionId, kind, view);
  return {
    title: kind === "boss" ? (mission.boss_config.title ?? "Boss challenge") : `${mission.title}: mission quiz`,
    intro:
      kind === "boss"
        ? (mission.boss_config.intro ?? "Put everything from this mission to the test.")
        : "Five questions from this mission. Score 80% or more to pass. You can retry with fresh questions.",
    passPct: kind === "boss" ? (mission.boss_config.passPct ?? 75) : 80,
    // Hints aren't offered in quizzes and bosses: they check mastery.
    questions: pool.map((q) => ({ question: toClient(q), hint1: null, hint2: null })),
  };
}

export type RoundResult = {
  pct: number;
  passed: boolean;
  results: { questionId: string; correct: boolean; explanation: string }[];
} & Celebration;

export async function submitRound(input: {
  missionId: string;
  kind: RoundKind;
  answers: { questionId: string; response: Response }[];
}): Promise<RoundResult> {
  const { student, view } = await assertMissionStage(input.missionId, input.kind);
  const db = createAdminClient();
  const mission = view.missions.find((m) => m.id === input.missionId)!;

  const ids = input.answers.map((a) => a.questionId);
  const { data } = await db.from("questions").select(`${QUESTION_COLUMNS}, lesson_id, mission_id`).in("id", ids);
  const lessonIds = new Set(mission.lessons.map((l) => l.id));
  const rows = (data ?? []) as (QuestionRow & { lesson_id: string | null; mission_id: string | null })[];
  const valid = rows.filter((q) =>
    input.kind === "boss" ? q.mission_id === input.missionId && !q.lesson_id : q.lesson_id && lessonIds.has(q.lesson_id),
  );
  const needed = input.kind === "boss" ? valid.length : 5;
  if (valid.length < Math.min(needed, ids.length) || ids.length === 0) throw new Error("Those questions aren't part of this round");

  const results = [];
  for (const a of input.answers) {
    const q = valid.find((r) => r.id === a.questionId);
    if (!q) continue;
    const correct = checkAnswer(q, a.response);
    await recordAttempt(db, { studentId: student.id, question: q, context: input.kind, correct, hintsUsed: 0 });
    results.push({ questionId: q.id, correct, explanation: q.explanation });
  }

  const pct = Math.round((results.filter((r) => r.correct).length / Math.max(1, results.length)) * 100);
  const passPct = input.kind === "boss" ? (mission.boss_config.passPct ?? 75) : 80;
  const passed = pct >= passPct;
  const now = new Date().toISOString();

  const { data: mp } = await db
    .from("mission_progress")
    .select("quiz_best_pct, boss_best_pct, quiz_passed_at, boss_passed_at, completed_at")
    .eq("student_id", student.id)
    .eq("mission_id", input.missionId)
    .maybeSingle();
  const row = {
    student_id: student.id,
    mission_id: input.missionId,
    quiz_best_pct: input.kind === "quiz" ? Math.max(pct, mp?.quiz_best_pct ?? 0) : (mp?.quiz_best_pct ?? 0),
    boss_best_pct: input.kind === "boss" ? Math.max(pct, mp?.boss_best_pct ?? 0) : (mp?.boss_best_pct ?? 0),
    quiz_passed_at: mp?.quiz_passed_at ?? (input.kind === "quiz" && passed ? now : null),
    boss_passed_at: mp?.boss_passed_at ?? (input.kind === "boss" && passed ? now : null),
    completed_at: mp?.completed_at ?? null,
  };

  const celebration: Celebration = { xp: 0 };
  if (passed) {
    celebration.xp += await awardXp(db, student.id, input.kind, input.missionId, input.kind === "quiz" ? XP.quizPassed : XP.bossBeaten);
  }
  // Boss beaten after the quiz (and the lessons, which unlocked it) → mission complete.
  if (row.quiz_passed_at && row.boss_passed_at && !row.completed_at) {
    row.completed_at = now;
    celebration.xp += await awardXp(db, student.id, "mission", input.missionId, XP.missionComplete);
    celebration.missionComplete = true;
  }
  await db.from("mission_progress").upsert(row, { onConflict: "student_id,mission_id" });

  const totals = await refreshTotals(db, student.id);
  if (totals.levelledUp) celebration.levelUp = totals.level;
  const badges = await checkBadges(db, student.id);
  if (badges.length) celebration.badges = badges;
  return { pct, passed, results, ...celebration };
}

// ---------------------------------------------------------------------------
// Capstone
// ---------------------------------------------------------------------------

export async function submitCapstone(input: { courseId: string; text: string; link?: string }): Promise<{ ok: boolean; error?: string }> {
  const student = await studentOrThrow();
  const view = await loadCourse(student, input.courseId);
  if (!view || (view.inside.capstone !== "available")) return { ok: false, error: "The capstone opens after every mission is done." };
  const text = input.text.trim();
  if (!isMeaningfulText(text, 60)) return { ok: false, error: "Tell us a bit more about what you made: a few sentences at least." };
  let link: string | null = null;
  if (input.link?.trim()) {
    try {
      const u = new URL(input.link.trim());
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      link = u.toString();
    } catch {
      return { ok: false, error: "That link doesn't look right. It should start with https://" };
    }
  }
  const db = createAdminClient();
  await db.from("submissions").insert({
    student_id: student.id,
    kind: "capstone",
    course_id: input.courseId,
    content: { text: text.slice(0, 4000), link },
    status: "pending",
  });
  await db
    .from("course_progress")
    .upsert({ student_id: student.id, course_id: input.courseId, status: "pending_review" }, { onConflict: "student_id,course_id" });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Daily warm-up (Retry Vault)
// ---------------------------------------------------------------------------

export async function getWarmup(): Promise<RoundPayload & { source: "vault" | "review" | "none" }> {
  const student = await studentOrThrow();
  const db = createAdminClient();
  const { data: due } = await db
    .from("retry_queue")
    .select("variant_group, box, due_at")
    .eq("student_id", student.id)
    .lte("due_at", new Date().toISOString())
    .order("box")
    .order("due_at")
    .limit(5);

  let groups = (due ?? []).map((d) => d.variant_group);
  let source: "vault" | "review" | "none" = groups.length ? "vault" : "none";

  // Nothing due: review a few questions from lessons already finished.
  if (groups.length < 3) {
    const { data: lp } = await db.from("lesson_progress").select("lesson_id").eq("student_id", student.id).not("completed_at", "is", null);
    const { data: past } = await db
      .from("questions")
      .select("variant_group")
      .in("lesson_id", (lp ?? []).map((l) => l.lesson_id))
      .eq("status", "published");
    const extra = [...new Set((past ?? []).map((p) => p.variant_group).filter(Boolean) as string[])]
      .filter((g) => !groups.includes(g))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3 - groups.length);
    if (extra.length) source = groups.length ? "vault" : "review";
    groups = [...groups, ...extra];
  }

  const questions = [];
  for (const g of groups) {
    const q = await pickVariant(g, []);
    if (q) questions.push({ question: toClient(q), hint1: q.hint1, hint2: q.hint2 });
  }
  return {
    title: "Daily warm-up",
    intro: "A few quick ones from earlier lessons, so they stick.",
    passPct: 0,
    questions,
    source: questions.length ? source : "none",
  };
}

export async function submitWarmup(answers: { questionId: string; response: Response }[]): Promise<RoundResult> {
  const student = await studentOrThrow();
  const db = createAdminClient();
  const { data } = await db.from("questions").select(QUESTION_COLUMNS).in("id", answers.map((a) => a.questionId)).eq("status", "published");
  const rows = (data ?? []) as QuestionRow[];
  const results = [];
  for (const a of answers.slice(0, 5)) {
    const q = rows.find((r) => r.id === a.questionId);
    if (!q) continue;
    const correct = checkAnswer(q, a.response);
    await recordAttempt(db, { studentId: student.id, question: q, context: "warmup", correct, hintsUsed: 0 });
    results.push({ questionId: q.id, correct, explanation: q.explanation });
  }
  const pct = Math.round((results.filter((r) => r.correct).length / Math.max(1, results.length)) * 100);
  const celebration: Celebration = { xp: 0 };
  if (results.length) celebration.xp = await awardXp(db, student.id, "warmup", istDay(new Date()), XP.warmup);
  const totals = await refreshTotals(db, student.id);
  if (totals.levelledUp) celebration.levelUp = totals.level;
  const badges = await checkBadges(db, student.id);
  if (badges.length) celebration.badges = badges;
  return { pct, passed: true, results, ...celebration };
}
