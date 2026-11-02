import { describe, expect, it } from "vitest";
import { isDue, onCorrect, onMiss, pickWarmup } from "./leitner";
import { istWeekStart, weeklyStreak } from "./streaks";
import {
  canStartCourse,
  computeCourseInside,
  computeCourseStates,
  type PathCourse,
  type PathSlot,
  type ProgressStatus,
} from "./unlocks";
import { levelForXp, practiceStepXp, rankForCompletedCourses, xpForLevel, xpToNext } from "./xp";

describe("xp and levels", () => {
  it("follows 100 + 40 × (level − 1)", () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(140);
    expect(xpForLevel(3)).toBe(240);
  });

  it("works out level and progress from total XP", () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, intoLevel: 0, needed: 100 });
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100)).toMatchObject({ level: 2, intoLevel: 0 });
    expect(levelForXp(250)).toMatchObject({ level: 3, intoLevel: 10, needed: 180 });
  });

  it("caps at level 50", () => {
    expect(levelForXp(10_000_000)).toMatchObject({ level: 50, pct: 100 });
  });

  it("ranks up only with completed courses", () => {
    expect(rankForCompletedCourses(0)).toBe("rookie");
    expect(rankForCompletedCourses(1)).toBe("explorer");
    expect(rankForCompletedCourses(3)).toBe("builder");
    expect(rankForCompletedCourses(30)).toBe("legend");
  });

  it("rewards perfect tries and bouncing back, never replays", () => {
    expect(practiceStepXp({ firstTime: true, mistakes: 0, bounceBacks: 0, hintsUsed: 0 })).toBe(15);
    expect(practiceStepXp({ firstTime: true, mistakes: 2, bounceBacks: 2, hintsUsed: 1 })).toBe(20);
    expect(practiceStepXp({ firstTime: true, mistakes: 0, bounceBacks: 0, hintsUsed: 1 })).toBe(13);
    expect(practiceStepXp({ firstTime: false, mistakes: 0, bounceBacks: 0, hintsUsed: 0 })).toBe(0);
  });
});

describe("leitner retry vault", () => {
  const now = new Date("2026-11-03T10:00:00Z");

  it("sends a miss to box 1, due tomorrow", () => {
    const e = onMiss(now);
    expect(e.box).toBe(1);
    expect(e.dueAt.toISOString()).toBe("2026-11-04T10:00:00.000Z");
  });

  it("moves up through 3, 7 and 14 days, then retires", () => {
    let e = onCorrect({ box: 1 }, now)!;
    expect(e.box).toBe(2);
    expect((e.dueAt.getTime() - now.getTime()) / 86_400_000).toBe(3);
    e = onCorrect(e, now)!;
    expect((e.dueAt.getTime() - now.getTime()) / 86_400_000).toBe(7);
    e = onCorrect(e, now)!;
    expect((e.dueAt.getTime() - now.getTime()) / 86_400_000).toBe(14);
    expect(onCorrect(e, now)).toBeNull();
  });

  it("picks due questions, lowest box and most overdue first", () => {
    const d = (h: number) => new Date(now.getTime() + h * 3_600_000);
    const entries = [
      { id: "a", box: 2, dueAt: d(-5) },
      { id: "b", box: 1, dueAt: d(-1) },
      { id: "c", box: 1, dueAt: d(-3) },
      { id: "d", box: 1, dueAt: d(+3) },
    ];
    expect(pickWarmup(entries, now).map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(isDue(entries[3], now)).toBe(false);
  });
});

describe("weekly streaks", () => {
  it("uses Monday-start IST weeks", () => {
    // Sunday 23:00 IST is still the same week; Monday 00:30 IST starts a new one.
    expect(istWeekStart(new Date("2026-11-08T17:30:00Z"))).toBe("2026-11-02");
    expect(istWeekStart(new Date("2026-11-08T19:00:00Z"))).toBe("2026-11-09");
  });

  it("counts consecutive weeks that met the goal", () => {
    const now = new Date("2026-11-05T06:00:00Z"); // Thursday
    const days = (dates: string[]) => dates.map((d) => new Date(`${d}T06:00:00Z`));
    const activity = days([
      "2026-10-20", "2026-10-21", "2026-10-22", // week of Oct 19: 3 days
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", // week of Oct 26: 4 days
      "2026-11-02", "2026-11-03", "2026-11-03", // this week: 2 distinct days
    ]);
    const s = weeklyStreak(activity, 3, now);
    expect(s.daysThisWeek).toBe(2);
    expect(s.goalMetThisWeek).toBe(false);
    expect(s.weeks).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Unlock engine
// ---------------------------------------------------------------------------

const c = (id: string, level: number, orderIndex: number | null, slotId: string | null = null, kind: "standard" | "bridge" = "standard"): PathCourse => ({
  id,
  level,
  kind,
  orderIndex,
  slotId,
});

// Level 1: A, B, C fixed. Level 2: D, slot S (E | F), G.
const courses: PathCourse[] = [
  c("A", 1, 1),
  c("B", 1, 2),
  c("C", 1, 3),
  c("D", 2, 1),
  c("E", 2, null, "S"),
  c("F", 2, null, "S"),
  c("G", 2, 3),
  c("BR", 1, null, null, "bridge"),
];
const slots: PathSlot[] = [{ id: "S", level: 2, orderIndex: 2 }];

const run = (contentLevel: number, progress: Record<string, ProgressStatus>, extra: Partial<Parameters<typeof computeCourseStates>[0]> = {}) =>
  computeCourseStates({ contentLevel, needsBridge: false, courses, slots, progress, ...extra });

describe("course unlocks", () => {
  it("opens only the first course of the level; the rest are visible but locked", () => {
    const r = run(1, {});
    expect(r.states).toMatchObject({ A: "available", B: "locked", C: "locked", D: "locked" });
    expect(canStartCourse(r, "A")).toBe(true);
    expect(canStartCourse(r, "B")).toBe(false);
  });

  it("unlocks the next course only when the previous one is completed", () => {
    expect(run(1, { A: "in_progress" }).states).toMatchObject({ A: "in_progress", B: "locked" });
    expect(run(1, { A: "completed" }).states).toMatchObject({ A: "completed", B: "available", C: "locked" });
  });

  it("shows the next course in preview while a capstone waits for review", () => {
    const r = run(1, { A: "completed", B: "pending_review" });
    expect(r.states).toMatchObject({ B: "pending_review", C: "preview" });
    expect(canStartCourse(r, "C")).toBe(false);
  });

  it("offers every course in a slot, then locks the others once one is picked", () => {
    expect(run(2, { D: "completed" }).states).toMatchObject({ E: "available", F: "available", G: "locked" });
    const picked = run(2, { D: "completed", E: "in_progress" });
    expect(picked.states).toMatchObject({ E: "in_progress", F: "locked", G: "locked" });
    expect(picked.activeCourseId).toBe("E");
    expect(canStartCourse(picked, "F")).toBe(false);
  });

  it("counts a slot as done when any one of its courses is completed", () => {
    expect(run(2, { D: "completed", F: "completed" }).states).toMatchObject({ E: "locked", G: "available" });
  });

  it("opens unchosen slot courses after the level is complete (open play)", () => {
    const r = run(2, { D: "completed", F: "completed", G: "completed" });
    expect(r.levelComplete).toBe(true);
    expect(r.states.E).toBe("available");
  });

  it("puts the Bridge first for students placed above Level 1", () => {
    const r = run(2, {}, { needsBridge: true });
    expect(r.states).toMatchObject({ BR: "available", D: "locked" });
    expect(run(2, { BR: "completed" }, { needsBridge: true }).states.D).toBe("available");
  });

  it("keeps courses from other levels locked, but completed ones stay completed", () => {
    const r = run(2, { A: "completed" });
    expect(r.states).toMatchObject({ A: "completed", B: "locked", D: "available" });
  });

  it("applies staff overrides: unlock opens a course, reset ignores progress", () => {
    expect(run(1, {}, { overrides: [{ courseId: "C", action: "unlock" }] }).states.C).toBe("available");
    expect(run(1, { A: "completed" }, { overrides: [{ courseId: "A", action: "reset" }] }).states).toMatchObject({
      A: "available",
      B: "locked",
    });
  });
});

describe("inside a course", () => {
  const structure = { missions: [{ id: "m1", lessonIds: ["l1", "l2"] }, { id: "m2", lessonIds: ["l3"] }] };
  const empty = () => ({
    lessonsDone: new Set<string>(),
    quizzesPassed: new Set<string>(),
    bossesPassed: new Set<string>(),
    missionsDone: new Set<string>(),
    capstoneStatus: "none" as const,
  });

  it("locks everything in a locked or preview course", () => {
    const r = computeCourseInside(structure, empty(), "preview");
    expect(Object.values(r.lessons).every((s) => s === "locked")).toBe(true);
    expect(r.next).toBeNull();
  });

  it("opens lessons one at a time, then the quiz, then the boss", () => {
    const p = empty();
    let r = computeCourseInside(structure, p, "in_progress");
    expect(r.lessons).toEqual({ l1: "available", l2: "locked", l3: "locked" });
    expect(r.next).toEqual({ kind: "lesson", lessonId: "l1" });

    p.lessonsDone.add("l1").add("l2");
    r = computeCourseInside(structure, p, "in_progress");
    expect(r.missions.m1.quiz).toBe("available");
    expect(r.missions.m1.boss).toBe("locked");
    expect(r.lessons.l3).toBe("locked");

    p.quizzesPassed.add("m1");
    r = computeCourseInside(structure, p, "in_progress");
    expect(r.next).toEqual({ kind: "boss", missionId: "m1" });

    p.bossesPassed.add("m1");
    r = computeCourseInside(structure, p, "in_progress");
    expect(r.missions.m1.complete).toBe(true);
    expect(r.lessons.l3).toBe("available");
  });

  it("opens the capstone after every mission and tracks review", () => {
    const p = empty();
    ["l1", "l2", "l3"].forEach((l) => p.lessonsDone.add(l));
    ["m1", "m2"].forEach((m) => {
      p.quizzesPassed.add(m);
      p.bossesPassed.add(m);
    });
    expect(computeCourseInside(structure, p, "in_progress").capstone).toBe("available");
    expect(computeCourseInside(structure, { ...p, capstoneStatus: "pending" }, "pending_review").capstone).toBe("pending_review");
  });
});
