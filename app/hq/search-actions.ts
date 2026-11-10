"use server";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = { group: string; label: string; detail?: string; href: string };

/** Command palette search across records the signed-in role can read (RLS applies). */
export async function hqSearch(query: string): Promise<SearchHit[]> {
  await requireStaff();
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const like = `%${q.replace(/[%_]/g, "")}%`;

  const safe = q.replace(/[%_,()]/g, "");
  const [courses, lessons, students, videos, skills, orgs, contacts, deals] = await Promise.all([
    supabase.from("courses").select("id, title, short_title").or(`title.ilike.${like},short_title.ilike.${like}`).limit(5),
    supabase.from("lessons").select("id, title").ilike("title", like).limit(5),
    supabase.from("students").select("id, display_name, class_grade").ilike("display_name", like).is("deleted_at", null).limit(5),
    supabase.from("videos").select("id, title").ilike("title", like).limit(5),
    supabase.from("skills").select("id, name").ilike("name", like).limit(5),
    supabase.from("organizations").select("id, name, city").ilike("name", like).limit(5),
    supabase.from("contacts").select("id, name, email").or(`name.ilike.%${safe}%,email.ilike.%${safe}%`).limit(5),
    supabase.from("deals").select("id, title").ilike("title", like).limit(5),
  ]);

  return [
    ...(courses.data ?? []).map((c) => ({ group: "Courses", label: c.short_title ?? c.title, detail: c.short_title ? c.title : undefined, href: `/hq/content/courses/${c.id}` })),
    ...(lessons.data ?? []).map((l) => ({ group: "Lessons", label: l.title, href: `/hq/content/lessons/${l.id}` })),
    ...(students.data ?? []).map((s) => ({ group: "Students", label: s.display_name, detail: `Class ${s.class_grade}`, href: `/hq/ops/students/${s.id}` })),
    ...(videos.data ?? []).map((v) => ({ group: "Videos", label: v.title, href: `/hq/content/videos/${v.id}` })),
    ...(skills.data ?? []).map((s) => ({ group: "Skills", label: s.name, href: `/hq/content/skills#${s.id}` })),
    ...(orgs.data ?? []).map((o) => ({ group: "Organizations", label: o.name, detail: o.city ?? undefined, href: `/hq/crm/organizations/${o.id}` })),
    ...(contacts.data ?? []).map((c) => ({ group: "Contacts", label: c.name, detail: c.email ?? undefined, href: `/hq/crm/contacts/${c.id}` })),
    ...(deals.data ?? []).map((d) => ({ group: "Deals", label: d.title, href: `/hq/crm/deals/${d.id}` })),
  ];
}
