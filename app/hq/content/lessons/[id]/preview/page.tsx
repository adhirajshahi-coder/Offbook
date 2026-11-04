import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/app/play/lesson/[id]/LessonPlayer";
import { requireStaff } from "@/lib/auth";
import { buildPlayerSteps } from "@/lib/play/player-steps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Preview lesson" };

const BANDS = new Set(["explore", "build", "launch"]);

/** The lesson exactly as a student in the chosen band sees it (PRD §10.2). */
export default async function PreviewLessonPage({ params, searchParams }: PageProps<"/hq/content/lessons/[id]/preview">) {
  await requireStaff(["content"]);
  const { id } = await params;
  const { band: rawBand } = await searchParams;
  const band = typeof rawBand === "string" && BANDS.has(rawBand) ? rawBand : "explore";

  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("id, title").eq("id", id).maybeSingle();
  if (!lesson) notFound();
  const steps = await buildPlayerSteps(id);

  return (
    <div data-band={band} className="-m-5 min-h-full bg-bg text-text">
      <LessonPlayer lessonTitle={lesson.title} courseSlug="" steps={steps} startAt={0} preview exitHref={`/hq/content/lessons/${id}`} />
    </div>
  );
}
