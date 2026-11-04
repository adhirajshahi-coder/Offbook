import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { fromRow, type QuestionRow } from "@/lib/questions";
import { createClient } from "@/lib/supabase/server";
import { GroupEditor } from "./GroupEditor";

export const metadata: Metadata = { title: "Question group" };

export default async function GroupPage({ params }: PageProps<"/hq/content/questions/group/[key]">) {
  await requireStaff(["content"]);
  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);
  const supabase = await createClient();
  const [{ data: rows }, { data: skills }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, type, prompt, options, answer, explanation, hint1, hint2, difficulty, status, skill_id, lesson_id, mission_id, lessons(id, title), missions(id, title)")
      .eq("variant_group", key)
      .neq("status", "archived")
      .order("seed_key")
      .order("created_at"),
    supabase.from("skills").select("id, name, tracks(zone_name)").order("name"),
  ]);
  if (!rows?.length) notFound();

  const first = rows[0];
  const lesson = first.lessons as unknown as { id: string; title: string } | null;
  const mission = first.missions as unknown as { id: string; title: string } | null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={first.prompt.slice(0, 80) || "Question group"}
        crumbs={[
          { href: "/hq/content/questions", label: "Questions" },
          lesson ? { href: `/hq/content/lessons/${lesson.id}`, label: lesson.title } : { href: `/hq/content/missions/${mission?.id}`, label: `${mission?.title} (boss)` },
        ]}
      />
      {lesson && (
        <p className="mb-3 text-sm text-[#6b6778]">
          Attach this group to a Try step in{" "}
          <Link href={`/hq/content/lessons/${lesson.id}`} className="font-semibold text-violet-700 hover:underline">
            the lesson editor
          </Link>
          .
        </p>
      )}
      <GroupEditor
        groupKey={key}
        initial={rows.map((r) => ({ id: r.id, seed: fromRow(r as unknown as QuestionRow) }))}
        skills={(skills ?? []).map((s) => ({ id: s.id, name: s.name, zone: (s.tracks as unknown as { zone_name: string } | null)?.zone_name ?? "Other" }))}
        skillId={first.skill_id}
        status={rows.some((r) => r.status === "published") ? "published" : "draft"}
      />
    </div>
  );
}
