import "server-only";
import { cache } from "react";
import { needsBridge as needsBridgeFor, type ContentLevel } from "@/lib/bands";
import {
  computeCourseInside,
  computeCourseStates,
  type CourseInside,
  type CourseState,
  type ProgressStatus,
  type UnlockResult,
} from "@/lib/gamification/unlocks";
import { createAdminClient } from "@/lib/supabase/server";
import type { Student } from "./session";

/**
 * Loads a student's world from the DB with the service role, then runs the
 * pure unlock engine. Callers must have verified the student first
 * (lib/play/session.ts). Only published content is considered.
 */

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  short_title: string | null;
  promise: string;
  level: number;
  kind: "standard" | "bridge";
  order_index: number | null;
  slot_id: string | null;
  priority: string;
  capstone: { brief?: string };
  track_id: string;
};

export type TrackRow = { id: string; slug: string; name: string; zone_name: string; color: string; order_index: number };
export type SlotRow = { id: string; level: number; order_index: number; title: string };

export type World = {
  tracks: TrackRow[];
  courses: CourseRow[];
  slots: SlotRow[];
  unlock: UnlockResult;
  progress: Record<string, ProgressStatus>;
};

export const loadWorld = cache(async (student: Student): Promise<World> => {
  const db = createAdminClient();
  const [tracks, courses, slots, progress, overrides] = await Promise.all([
    db.from("tracks").select("id, slug, name, zone_name, color, order_index").eq("status", "published").order("order_index"),
    db
      .from("courses")
      .select("id, slug, title, short_title, promise, level, kind, order_index, slot_id, priority, capstone, track_id")
      .eq("status", "published"),
    db.from("course_slots").select("id, level, order_index, title"),
    db.from("course_progress").select("course_id, status").eq("student_id", student.id),
    db.from("course_overrides").select("course_id, action, created_at").eq("student_id", student.id).order("created_at"),
  ]);

  const progressMap: Record<string, ProgressStatus> = {};
  for (const p of progress.data ?? []) progressMap[p.course_id] = p.status as ProgressStatus;

  const courseRows = (courses.data ?? []) as CourseRow[];
  const unlock = computeCourseStates({
    contentLevel: student.content_level,
    needsBridge: needsBridgeFor(student.started_level as ContentLevel),
    courses: courseRows.map((c) => ({ id: c.id, level: c.level, kind: c.kind, orderIndex: c.order_index, slotId: c.slot_id })),
    slots: (slots.data ?? []).map((s) => ({ id: s.id, level: s.level, orderIndex: s.order_index })),
    progress: progressMap,
    overrides: (overrides.data ?? []).map((o) => ({ courseId: o.course_id, action: o.action as "unlock" | "reset" })),
  });

  return {
    tracks: (tracks.data ?? []) as TrackRow[],
    courses: courseRows,
    slots: (slots.data ?? []) as SlotRow[],
    unlock,
    progress: progressMap,
  };
});

export type LessonRow = { id: string; title: string; summary: string; est_minutes: number; order_index: number };
export type MissionRow = {
  id: string;
  title: string;
  output_description: string;
  order_index: number;
  status: string;
  boss_config: { title?: string; intro?: string; passPct?: number };
  lessons: LessonRow[];
};

export type CourseView = {
  course: CourseRow;
  state: CourseState;
  missions: MissionRow[];
  /** Outlined missions not yet published ("coming soon"). */
  upcoming: { title: string; output_description: string }[];
  inside: CourseInside;
  capstoneSubmission: { status: string; feedback: string | null } | null;
};

export async function loadCourse(student: Student, courseId: string): Promise<CourseView | null> {
  const world = await loadWorld(student);
  const course = world.courses.find((c) => c.id === courseId);
  if (!course) return null;
  const state = world.unlock.states[course.id] ?? "locked";

  const db = createAdminClient();
  const { data: missionData } = await db
    .from("missions")
    .select("id, title, output_description, order_index, status, boss_config, lessons(id, title, summary, est_minutes, order_index, status)")
    .eq("course_id", course.id)
    .order("order_index");

  const all = (missionData ?? []).map((m) => ({
    ...m,
    lessons: (m.lessons ?? [])
      .filter((l: { status: string }) => l.status === "published")
      .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index),
  })) as MissionRow[];
  const missions = all.filter((m) => m.status === "published" && m.lessons.length > 0);
  const upcoming = all.filter((m) => !missions.includes(m)).map((m) => ({ title: m.title, output_description: m.output_description }));

  const missionIds = missions.map((m) => m.id);
  const lessonIds = missions.flatMap((m) => m.lessons.map((l) => l.id));
  const [lp, mp, sub] = await Promise.all([
    lessonIds.length
      ? db.from("lesson_progress").select("lesson_id, completed_at").eq("student_id", student.id).in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string; completed_at: string | null }[] }),
    missionIds.length
      ? db
          .from("mission_progress")
          .select("mission_id, quiz_passed_at, boss_passed_at, completed_at")
          .eq("student_id", student.id)
          .in("mission_id", missionIds)
      : Promise.resolve({ data: [] as { mission_id: string; quiz_passed_at: string | null; boss_passed_at: string | null; completed_at: string | null }[] }),
    db
      .from("submissions")
      .select("status, feedback, created_at")
      .eq("student_id", student.id)
      .eq("kind", "capstone")
      .eq("course_id", course.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const capstoneStatus = sub.data
    ? sub.data.status === "pending"
      ? "pending"
      : sub.data.status === "approved"
        ? "approved"
        : sub.data.status === "revision"
          ? "revision"
          : "rejected"
    : "none";

  const inside = computeCourseInside(
    { missions: missions.map((m) => ({ id: m.id, lessonIds: m.lessons.map((l) => l.id) })) },
    {
      lessonsDone: new Set((lp.data ?? []).filter((r) => r.completed_at).map((r) => r.lesson_id)),
      quizzesPassed: new Set((mp.data ?? []).filter((r) => r.quiz_passed_at).map((r) => r.mission_id)),
      bossesPassed: new Set((mp.data ?? []).filter((r) => r.boss_passed_at).map((r) => r.mission_id)),
      missionsDone: new Set((mp.data ?? []).filter((r) => r.completed_at).map((r) => r.mission_id)),
      capstoneStatus,
    },
    state,
  );

  return {
    course,
    state,
    missions,
    upcoming,
    inside,
    capstoneSubmission: sub.data ? { status: sub.data.status, feedback: sub.data.feedback } : null,
  };
}

export async function loadCourseBySlug(student: Student, slug: string) {
  const world = await loadWorld(student);
  const course = world.courses.find((c) => c.slug === slug);
  return course ? loadCourse(student, course.id) : null;
}

/** Find which course a lesson or mission belongs to (published only). */
export async function courseIdForLesson(lessonId: string): Promise<{ courseId: string; missionId: string } | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("lessons")
    .select("id, mission_id, status, missions!inner(course_id, status)")
    .eq("id", lessonId)
    .maybeSingle();
  if (!data || data.status !== "published") return null;
  const m = data.missions as unknown as { course_id: string; status: string };
  if (m.status !== "published") return null;
  return { courseId: m.course_id, missionId: data.mission_id };
}

export async function courseIdForMission(missionId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from("missions").select("course_id, status").eq("id", missionId).maybeSingle();
  return data && data.status === "published" ? data.course_id : null;
}

/** The single next thing to do, for the Today screen's Continue card. */
export async function nextAction(student: Student) {
  const world = await loadWorld(student);
  const courseId =
    world.unlock.activeCourseId ??
    world.courses
      .filter((c) => world.unlock.states[c.id] === "available")
      .sort((a, b) => (a.kind === "bridge" ? -1 : 0) - (b.kind === "bridge" ? -1 : 0) || (a.order_index ?? 99) - (b.order_index ?? 99))[0]?.id ??
    null;
  if (!courseId) return null;
  const view = await loadCourse(student, courseId);
  if (!view) return null;
  return { view, next: view.inside.next };
}
