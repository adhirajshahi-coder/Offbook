import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, hqButton } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuestionGroupsTable, type GroupRow } from "./QuestionGroupsTable";

export const metadata: Metadata = { title: "Questions" };

export default async function QuestionsPage({ searchParams }: PageProps<"/hq/content/questions">) {
  await requireStaff(["content"]);
  const sp = await searchParams;
  const lessonId = typeof sp.lesson === "string" ? sp.lesson : null;
  const missionId = typeof sp.mission === "string" ? sp.mission : null;
  const boss = sp.boss === "1";

  const supabase = await createClient();
  let query = supabase
    .from("questions")
    .select("variant_group, type, prompt, status, lesson_id, mission_id, skills(name), lessons(title, missions(title, courses(short_title, title))), missions(title, courses(short_title, title))")
    .neq("status", "archived")
    .order("seed_key");
  if (lessonId) query = query.eq("lesson_id", lessonId);
  if (missionId) query = boss ? query.eq("mission_id", missionId).is("lesson_id", null) : query.eq("mission_id", missionId);
  const { data } = await query.limit(2000);

  const groups = new Map<string, GroupRow>();
  for (const q of data ?? []) {
    if (!q.variant_group) continue;
    const lesson = q.lessons as unknown as { title: string; missions: { title: string; courses: { short_title: string | null; title: string } } } | null;
    const mission = q.missions as unknown as { title: string; courses: { short_title: string | null; title: string } } | null;
    const course = lesson?.missions.courses ?? mission?.courses;
    const g = groups.get(q.variant_group) ?? {
      key: q.variant_group,
      prompt: q.prompt,
      type: q.type,
      where: lesson ? `${course?.short_title ?? course?.title} · ${lesson.title}` : `${course?.short_title ?? course?.title} · ${mission?.title} (boss)`,
      skill: (q.skills as unknown as { name: string } | null)?.name ?? "",
      variants: 0,
      published: 0,
    };
    g.variants++;
    if (q.status === "published") g.published++;
    groups.set(q.variant_group, g);
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={boss ? "Boss questions" : "Questions"}
        crumbs={[{ href: "/hq/content", label: "Content" }]}
        description="Each group tests one idea in a few variants. Students get a fresh variant after a mistake."
        actions={
          lessonId || missionId ? (
            <form action={`/hq/content/questions/new`}>
              {lessonId && <input type="hidden" name="lesson" value={lessonId} />}
              {missionId && <input type="hidden" name="mission" value={missionId} />}
              <button className={hqButton("primary")}>New question group</button>
            </form>
          ) : (
            <span className="text-xs text-[#6b6778]">To add questions, open a lesson and use “New question group”.</span>
          )
        }
      />
      {(lessonId || missionId) && (
        <p className="mb-3 text-sm">
          <Link href="/hq/content/questions" className="text-violet-700 hover:underline">
            Show all questions
          </Link>
        </p>
      )}
      <QuestionGroupsTable rows={[...groups.values()]} />
    </div>
  );
}
