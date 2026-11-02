import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/play/session";
import { courseIdForLesson, loadCourse } from "@/lib/play/state";
import { createAdminClient } from "@/lib/supabase/server";
import { LessonPlayer, type PlayerStep } from "./LessonPlayer";

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
  const db = createAdminClient();
  const [{ data: steps }, { data: done }] = await Promise.all([
    db.from("lesson_steps").select("id, type, content, order_index").eq("lesson_id", id).order("order_index"),
    db.from("step_progress").select("step_id, completed_at").eq("student_id", student.id),
  ]);
  const doneIds = new Set((done ?? []).filter((d) => d.completed_at).map((d) => d.step_id));

  // Send only what each step needs. Practice steps carry group keys, never questions or answers.
  const playerSteps: PlayerStep[] = (steps ?? []).map((s) => {
    const c = s.content as Record<string, unknown>;
    switch (s.type) {
      case "study_deck":
        return { id: s.id, type: "study_deck", label: c.label as string | undefined, cards: (c.cards as never) ?? [] };
      case "practice":
        return { id: s.id, type: "practice", label: c.label as string | undefined, groups: (c.groups as string[]) ?? [] };
      case "make":
        return { id: s.id, type: "make", prompt: String(c.prompt ?? ""), rubric: (c.rubric as string[]) ?? [] };
      case "reflect":
        return { id: s.id, type: "reflect", prompt: String(c.prompt ?? "What surprised you?") };
      default:
        return { id: s.id, type: "video", label: c.label as string | undefined };
    }
  });

  // Replays start at the beginning; otherwise resume at the first unfinished step.
  const firstOpen = playerSteps.findIndex((s) => !doneIds.has(s.id));
  const startAt = state === "completed" ? 0 : firstOpen === -1 ? 0 : firstOpen;

  return <LessonPlayer lessonTitle={lesson.title} courseSlug={view.course.slug} steps={playerSteps} startAt={startAt} />;
}
