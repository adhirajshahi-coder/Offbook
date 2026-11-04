import type { Metadata } from "next";
import { PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SkillsEditor } from "./SkillsEditor";

export const metadata: Metadata = { title: "Skills" };

export default async function SkillsPage() {
  await requireStaff(["content"]);
  const supabase = await createClient();
  const [{ data: tracks }, { data: skills }, { data: links }] = await Promise.all([
    supabase.from("tracks").select("id, zone_name, order_index").order("order_index"),
    supabase.from("skills").select("id, name, description, track_id, lesson_skills(lesson_id)").order("name"),
    supabase.from("skill_links").select("from_skill_id, to_skill_id, link_type"),
  ]);
  const zone = new Map((tracks ?? []).map((t) => [t.id, t.zone_name]));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Skills and links"
        crumbs={[{ href: "/hq/content", label: "Content" }]}
        description="Skills feed the student skill map. Links connect the dots across lessons and zones."
      />
      <SkillsEditor
        tracks={(tracks ?? []).map((t) => ({ id: t.id, zone: t.zone_name }))}
        skills={(skills ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          track_id: s.track_id,
          zone: zone.get(s.track_id) ?? "",
          lessons: (s.lesson_skills ?? []).length,
        }))}
        links={(links ?? []).map((l) => ({ from: l.from_skill_id, to: l.to_skill_id, type: l.link_type }))}
      />
    </div>
  );
}
