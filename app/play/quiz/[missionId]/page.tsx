import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/play/session";
import { courseIdForMission, loadCourse } from "@/lib/play/state";
import { RoundClient } from "../../round-client";

export const metadata: Metadata = { title: "Mission quiz" };

export default async function Page({ params }: PageProps<"/play/quiz/[missionId]">) {
  const student = await requireStudent();
  const { missionId } = await params;
  const courseId = await courseIdForMission(missionId);
  if (!courseId) notFound();
  const view = await loadCourse(student, courseId);
  if (!view) notFound();
  // Server-enforced: no skipping ahead by URL.
  if (!view.inside.missions[missionId] || view.inside.missions[missionId].quiz === "locked") {
    redirect(`/play/course/${view.course.slug}?locked=1`);
  }
  return <RoundClient kind="quiz" missionId={missionId} backHref={`/play/course/${view.course.slug}`} />;
}
