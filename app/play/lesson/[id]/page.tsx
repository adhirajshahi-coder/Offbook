import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buildPlayerSteps } from "@/lib/play/player-steps";
import { requireStudent } from "@/lib/play/session";
import { courseIdForLesson, loadCourse } from "@/lib/play/state";
import { createAdminClient } from "@/lib/supabase/server";
import { LessonPlayer } from "./LessonPlayer";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage({ params }: PageProps<"/play/lesson/[id]">) {
  const student = await requireStudent();
  const { id } = await params;

  // Server-enforced unlock: a locked lesson can't be opened by URL.
  const ref = await courseIdForLesson(id);
  if (!ref) notFound();
  const view = await loadCourse(student, ref.courseId);
  if (!view) notFound();
  const state = view.inside.lessons[id];
  if (!state || state === "locked") redirect(`/play/course/${view.course.slug}?locked=1`);

  const lesson = view.missions.flatMap((m) => m.lessons).find((l) => l.id === id)!;
  const [playerSteps, { data: done }] = await Promise.all([
    buildPlayerSteps(id),
    createAdminClient().from("step_progress").select("step_id, completed_at").eq("student_id", student.id),
  ]);
  const doneIds = new Set((done ?? []).filter((d) => d.completed_at).map((d) => d.step_id));

  // Replays start at the beginning; otherwise resume at the first unfinished step.
  const firstOpen = playerSteps.findIndex((s) => !doneIds.has(s.id));
  const startAt = state === "completed" ? 0 : firstOpen === -1 ? 0 : firstOpen;

  return <LessonPlayer lessonTitle={lesson.title} courseSlug={view.course.slug} steps={playerSteps} startAt={startAt} />;
}
