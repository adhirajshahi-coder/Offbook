/**
 * Unlock engine (PRD §8, curriculum mapping §3–§4). Pure functions: the
 * server loads state from the DB, asks these what's allowed, and refuses
 * anything else. The client only ever reflects the result.
 *
 * Rules
 * - One ordered path per content level: fixed courses (order_index) and
 *   choice slots (pick one course) share one sequence.
 * - Students placed above Level 1 take the Bridge first.
 * - Strict order, one active course at a time. Locked courses stay visible.
 * - A course waiting for capstone review shows the next step in preview.
 * - When the level's path is done, unchosen slot courses open (open play),
 *   still one at a time.
 * - Staff overrides: "unlock" opens a course, "reset" ignores its progress.
 */

export type CourseState = "locked" | "available" | "in_progress" | "pending_review" | "completed" | "preview";

export type PathCourse = {
  id: string;
  level: number;
  kind: "standard" | "bridge";
  orderIndex: number | null;
  slotId: string | null;
};

export type PathSlot = { id: string; level: number; orderIndex: number };

export type ProgressStatus = "in_progress" | "pending_review" | "completed";

export type Override = { courseId: string; action: "unlock" | "reset" };

export type UnlockInput = {
  contentLevel: number;
  needsBridge: boolean;
  courses: PathCourse[];
  slots: PathSlot[];
  progress: Record<string, ProgressStatus>;
  overrides?: Override[];
};

export type UnlockResult = {
  states: Record<string, CourseState>;
  /** The course the student is working on now, if any. */
  activeCourseId: string | null;
  /** Every step on the current level's path is done. */
  levelComplete: boolean;
};

type Step = { kind: "course"; course: PathCourse } | { kind: "slot"; slot: PathSlot; members: PathCourse[] };

function isWorking(s: ProgressStatus | undefined): s is "in_progress" | "pending_review" {
  return s === "in_progress" || s === "pending_review";
}

export function computeCourseStates(input: UnlockInput): UnlockResult {
  const overrides = input.overrides ?? [];
  const progress: Record<string, ProgressStatus> = { ...input.progress };
  for (const o of overrides) if (o.action === "reset") delete progress[o.courseId];

  const states: Record<string, CourseState> = {};
  for (const c of input.courses) states[c.id] = progress[c.id] === "completed" ? "completed" : "locked";

  // Build this level's path.
  const steps: Step[] = [];
  const bridge = input.courses.find((c) => c.kind === "bridge");
  if (input.needsBridge && bridge) steps.push({ kind: "course", course: bridge });

  const levelCourses = input.courses.filter((c) => c.level === input.contentLevel && c.kind === "standard");
  const ordered: { order: number; step: Step }[] = [
    ...levelCourses
      .filter((c) => c.orderIndex != null && !c.slotId)
      .map((c) => ({ order: c.orderIndex!, step: { kind: "course", course: c } as Step })),
    ...input.slots
      .filter((s) => s.level === input.contentLevel)
      .map((s) => ({
        order: s.orderIndex,
        step: { kind: "slot", slot: s, members: levelCourses.filter((c) => c.slotId === s.id) } as Step,
      })),
  ].sort((a, b) => a.order - b.order);
  steps.push(...ordered.map((o) => o.step));

  const stepDone = (s: Step) =>
    s.kind === "course" ? progress[s.course.id] === "completed" : s.members.some((m) => progress[m.id] === "completed");

  const currentIndex = steps.findIndex((s) => !stepDone(s));
  const levelComplete = currentIndex === -1;

  if (!levelComplete) {
    const current = steps[currentIndex];
    let waitingForReview = false;

    if (current.kind === "course") {
      const p = progress[current.course.id];
      states[current.course.id] = isWorking(p) ? p : "available";
      waitingForReview = p === "pending_review";
    } else {
      const chosen = current.members.find((m) => isWorking(progress[m.id]));
      for (const m of current.members) {
        states[m.id] = chosen ? (m === chosen ? (progress[m.id] as CourseState) : "locked") : "available";
      }
      waitingForReview = chosen ? progress[chosen.id] === "pending_review" : false;
    }

    // Never block on staff latency: show what's next while the capstone is reviewed.
    const next = steps[currentIndex + 1];
    if (waitingForReview && next) {
      const members = next.kind === "course" ? [next.course] : next.members;
      for (const m of members) if (states[m.id] === "locked") states[m.id] = "preview";
    }
  } else {
    // Open play: the slot courses not picked earlier, one at a time.
    const openPlay = steps.flatMap((s) => (s.kind === "slot" ? s.members : [])).filter((m) => progress[m.id] !== "completed");
    const working = openPlay.find((m) => isWorking(progress[m.id]));
    for (const m of openPlay) {
      states[m.id] = working ? (m === working ? (progress[m.id] as CourseState) : "locked") : "available";
    }
  }

  for (const o of overrides) {
    if (o.action !== "unlock") continue;
    const p = progress[o.courseId];
    if (states[o.courseId] === "locked" || states[o.courseId] === "preview") {
      states[o.courseId] = isWorking(p) ? p : "available";
    }
  }

  const activeCourseId =
    input.courses.find((c) => states[c.id] === "in_progress")?.id ??
    input.courses.find((c) => states[c.id] === "pending_review")?.id ??
    null;

  return { states, activeCourseId, levelComplete };
}

/** Can the student start (or keep working on) this course right now? */
export function canStartCourse(result: UnlockResult, courseId: string): boolean {
  const state = result.states[courseId];
  if (state === "in_progress") return true;
  if (state !== "available") return false;
  // One active course at a time.
  return result.activeCourseId === null || result.activeCourseId === courseId;
}

// ---------------------------------------------------------------------------
// Inside a course: missions and lessons
// ---------------------------------------------------------------------------

export type LessonState = "locked" | "available" | "completed";

export type CourseStructure = { missions: { id: string; lessonIds: string[] }[] };

export type CourseProgressDetail = {
  lessonsDone: Set<string>;
  quizzesPassed: Set<string>;
  bossesPassed: Set<string>;
  missionsDone: Set<string>;
  capstoneStatus: "none" | "pending" | "approved" | "revision" | "rejected";
};

export type CourseInside = {
  lessons: Record<string, LessonState>;
  missions: Record<string, { quiz: LessonState; boss: LessonState; complete: boolean }>;
  capstone: LessonState | "pending_review";
  /** First thing to do next, for the Continue card. */
  next:
    | { kind: "lesson"; lessonId: string }
    | { kind: "quiz" | "boss"; missionId: string }
    | { kind: "capstone" }
    | null;
};

/**
 * Lessons unlock in order through each mission. A mission is complete when
 * its lessons are done (each includes a Make step), its quiz is passed at
 * 80%+ and its boss is beaten. The capstone opens when every mission is done.
 */
export function computeCourseInside(
  structure: CourseStructure,
  p: CourseProgressDetail,
  courseState: CourseState,
): CourseInside {
  const lessons: Record<string, LessonState> = {};
  const missions: CourseInside["missions"] = {};
  let next: CourseInside["next"] = null;
  const open = courseState === "available" || courseState === "in_progress" || courseState === "completed" || courseState === "pending_review";

  let previousMissionDone = true;
  for (const m of structure.missions) {
    let previousLessonDone = previousMissionDone;
    for (const id of m.lessonIds) {
      const done = p.lessonsDone.has(id);
      lessons[id] = done ? "completed" : open && previousLessonDone ? "available" : "locked";
      if (!next && lessons[id] === "available") next = { kind: "lesson", lessonId: id };
      previousLessonDone = done;
    }
    const lessonsDone = m.lessonIds.every((id) => p.lessonsDone.has(id));
    const quizPassed = p.quizzesPassed.has(m.id);
    const bossPassed = p.bossesPassed.has(m.id);
    const quiz: LessonState = quizPassed ? "completed" : open && previousMissionDone && lessonsDone ? "available" : "locked";
    const boss: LessonState = bossPassed ? "completed" : open && previousMissionDone && lessonsDone && quizPassed ? "available" : "locked";
    if (!next && quiz === "available") next = { kind: "quiz", missionId: m.id };
    if (!next && boss === "available") next = { kind: "boss", missionId: m.id };
    const complete = p.missionsDone.has(m.id) || (lessonsDone && quizPassed && bossPassed);
    missions[m.id] = { quiz, boss, complete };
    previousMissionDone = previousMissionDone && complete;
  }

  let capstone: CourseInside["capstone"] = "locked";
  if (p.capstoneStatus === "approved") capstone = "completed";
  else if (p.capstoneStatus === "pending") capstone = "pending_review";
  else if (open && previousMissionDone && structure.missions.length > 0) capstone = "available";
  if (!next && capstone === "available") next = { kind: "capstone" };

  return { lessons, missions, capstone, next };
}
