import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createLesson, moveLesson } from "@/app/hq/content/actions";
import { ActionButton } from "@/components/hq/forms";
import { Card, Empty, PageHeader, StatusBadge, hqButton } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MissionForm } from "./MissionForm";

export const metadata: Metadata = { title: "Mission" };

export default async function MissionEditPage({ params }: PageProps<"/hq/content/missions/[id]">) {
  await requireStaff(["content"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("missions")
    .select("id, title, output_description, status, boss_config, order_index, course_id, courses(title, short_title), lessons(id, title, order_index, status, est_minutes)")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();
  const course = m.courses as unknown as { title: string; short_title: string | null };
  const lessons = [...(m.lessons ?? [])].sort((a, b) => a.order_index - b.order_index);
  const boss = (m.boss_config ?? {}) as { title?: string; intro?: string; passPct?: number };
  const { count: bossQuestions } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("mission_id", id).is("lesson_id", null);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title={`Mission ${m.order_index}: ${m.title}`}
        crumbs={[
          { href: "/hq/content", label: "Courses" },
          { href: `/hq/content/courses/${m.course_id}`, label: course.short_title ?? course.title },
        ]}
        actions={<StatusBadge status={m.status} />}
      />
      <Card title="Mission details and boss">
        <MissionForm
          mission={{
            id: m.id,
            title: m.title,
            output_description: m.output_description,
            status: m.status,
            boss_title: boss.title ?? "",
            boss_intro: boss.intro ?? "",
            boss_pass_pct: boss.passPct ?? 75,
          }}
        />
        <p className="mt-3 text-sm text-[#6b6778]">
          {bossQuestions ?? 0} boss questions.{" "}
          <Link href={`/hq/content/questions?mission=${id}&boss=1`} className="font-semibold text-violet-700 hover:underline">
            Edit boss questions
          </Link>
        </p>
      </Card>
      <Card
        title="Lessons"
        actions={
          <ActionButton
            variant="primary"
            onClick={async () => {
              "use server";
              return createLesson(id);
            }}
          >
            Add lesson
          </ActionButton>
        }
      >
        {lessons.length === 0 ? (
          <Empty>No lessons yet.</Empty>
        ) : (
          <ol className="divide-y divide-[#eeecf2]">
            {lessons.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <Link href={`/hq/content/lessons/${l.id}`} className="font-semibold text-violet-700 hover:underline">
                    Lesson {i + 1}: {l.title}
                  </Link>
                  <p className="text-xs text-[#6b6778]">{l.est_minutes} min</p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={l.status} />
                  <Link href={`/hq/content/lessons/${l.id}/preview`} className={hqButton("ghost")}>
                    Preview
                  </Link>
                  <ActionButton
                    variant="ghost"
                    onClick={async () => {
                      "use server";
                      return moveLesson(l.id, id, -1);
                    }}
                  >
                    <span aria-label="Move up">↑</span>
                  </ActionButton>
                  <ActionButton
                    variant="ghost"
                    onClick={async () => {
                      "use server";
                      return moveLesson(l.id, id, 1);
                    }}
                  >
                    <span aria-label="Move down">↓</span>
                  </ActionButton>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
