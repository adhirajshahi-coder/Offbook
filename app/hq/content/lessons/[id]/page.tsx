import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import type { EditorStep } from "@/lib/hq/lesson-validation";
import { createClient } from "@/lib/supabase/server";
import { LessonEditor, type GroupInfo } from "./LessonEditor";

export const metadata: Metadata = { title: "Lesson editor" };

export default async function LessonEditPage({ params }: PageProps<"/hq/content/lessons/[id]">) {
  await requireStaff(["content"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, summary, est_minutes, status, order_index, mission_id, missions(id, title, order_index, course_id, courses(title, short_title))")
    .eq("id", id)
    .maybeSingle();
  if (!lesson) notFound();

  const [{ data: steps }, { data: questions }, { data: skills }, { data: lessonSkills }, { data: videos }] = await Promise.all([
    supabase.from("lesson_steps").select("id, type, content, order_index").eq("lesson_id", id).order("order_index"),
    supabase.from("questions").select("variant_group, prompt, status").eq("lesson_id", id).order("seed_key"),
    supabase.from("skills").select("id, name, tracks(zone_name, order_index)").order("name"),
    supabase.from("lesson_skills").select("skill_id").eq("lesson_id", id),
    supabase.from("videos").select("id, title, duration_sec").eq("status", "ready").order("created_at", { ascending: false }),
  ]);

  const groups = new Map<string, GroupInfo>();
  for (const q of questions ?? []) {
    if (!q.variant_group) continue;
    const g = groups.get(q.variant_group) ?? { key: q.variant_group, sample: q.prompt.slice(0, 90), variants: 0, published: 0 };
    g.variants++;
    if (q.status === "published") g.published++;
    groups.set(q.variant_group, g);
  }

  const mission = lesson.missions as unknown as { id: string; title: string; order_index: number; course_id: string; courses: { title: string; short_title: string | null } };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={lesson.title}
        crumbs={[
          { href: "/hq/content", label: "Courses" },
          { href: `/hq/content/courses/${mission.course_id}`, label: mission.courses.short_title ?? mission.courses.title },
          { href: `/hq/content/missions/${mission.id}`, label: `Mission ${mission.order_index}` },
        ]}
      />
      <LessonEditor
        lesson={{ id: lesson.id, title: lesson.title, summary: lesson.summary, est_minutes: lesson.est_minutes, status: lesson.status, missionId: mission.id }}
        steps={(steps ?? []).map((s) => {
          const content = { ...(s.content as Record<string, unknown>) };
          delete content.type;
          return { id: s.id, type: s.type, content } as EditorStep;
        })}
        groups={[...groups.values()]}
        skills={(skills ?? [])
          .map((s) => ({ id: s.id, name: s.name, zone: (s.tracks as unknown as { zone_name: string } | null)?.zone_name ?? "Other" }))
          .sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name))}
        skillIds={(lessonSkills ?? []).map((s) => s.skill_id)}
        videos={videos ?? []}
      />
    </div>
  );
}
