import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createMission, moveMission } from "@/app/hq/content/actions";
import { ActionButton } from "@/components/hq/forms";
import { Card, Empty, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "./CourseForm";

export const metadata: Metadata = { title: "Course" };

export default async function CourseEditPage({ params }: PageProps<"/hq/content/courses/[id]">) {
  await requireStaff(["content"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, short_title, promise, capstone, cohort_variant, status, level, missions(id, title, order_index, status, lessons(id, status))")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();
  const missions = [...(course.missions ?? [])].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title={course.short_title ?? course.title}
        crumbs={[{ href: "/hq/content", label: "Courses" }]}
        description={`Level ${course.level} · ${course.slug}`}
        actions={<StatusBadge status={course.status} />}
      />
      <Card title="Course details">
        <CourseForm
          course={{
            id: course.id,
            title: course.title,
            short_title: course.short_title,
            promise: course.promise,
            capstone: (course.capstone as { brief?: string })?.brief ?? "",
            cohort: (course.cohort_variant as { brief?: string } | null)?.brief ?? "",
            status: course.status,
          }}
        />
      </Card>
      <Card
        title="Missions"
        actions={
          <ActionButton
            variant="primary"
            onClick={async () => {
              "use server";
              return createMission(id);
            }}
          >
            Add mission
          </ActionButton>
        }
      >
        {missions.length === 0 ? (
          <Empty>No missions yet. Add the first one.</Empty>
        ) : (
          <ol className="divide-y divide-[#eeecf2]">
            {missions.map((m, i) => {
              const live = (m.lessons ?? []).filter((l: { status: string }) => l.status === "published").length;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <Link href={`/hq/content/missions/${m.id}`} className="font-semibold text-violet-700 hover:underline">
                      Mission {i + 1}: {m.title}
                    </Link>
                    <p className="text-xs text-[#6b6778]">
                      {live} of {(m.lessons ?? []).length} lessons live
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={m.status} />
                    <ActionButton
                      variant="ghost"
                      onClick={async () => {
                        "use server";
                        return moveMission(m.id, id, -1);
                      }}
                    >
                      <span aria-label="Move up">↑</span>
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      onClick={async () => {
                        "use server";
                        return moveMission(m.id, id, 1);
                      }}
                    >
                      <span aria-label="Move down">↓</span>
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
