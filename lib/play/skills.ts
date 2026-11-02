import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type GraphSkill = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Belongs to this course (vs. a linked skill from elsewhere). */
  inCourse: boolean;
  /** Where else it shows up: course titles. */
  courseTitle: string | null;
  mastery: number; // 0–3, or -1 never practised
  lessons: string[];
};

export type GraphLink = { from: string; to: string; type: "prerequisite" | "related" | "applies_in" };

/** Skills taught in a course, plus the skills they connect to across tracks (PRD §7.3). */
export async function loadSkillGraph(studentId: string, courseId: string): Promise<{ skills: GraphSkill[]; links: GraphLink[] }> {
  const db = createAdminClient();
  const { data: lessonRows } = await db
    .from("lessons")
    .select("id, title, missions!inner(course_id), lesson_skills(skill_id)")
    .eq("missions.course_id", courseId)
    .eq("status", "published");

  const lessonsBySkill = new Map<string, string[]>();
  for (const l of lessonRows ?? []) {
    for (const ls of (l.lesson_skills ?? []) as { skill_id: string }[]) {
      if (!lessonsBySkill.has(ls.skill_id)) lessonsBySkill.set(ls.skill_id, []);
      lessonsBySkill.get(ls.skill_id)!.push(l.title);
    }
  }
  const own = new Set(lessonsBySkill.keys());
  if (own.size === 0) return { skills: [], links: [] };

  // Skills of this track that no lesson teaches yet (outlined missions) belong
  // to this course's map too, shown as not yet practised.
  const { data: course } = await db.from("courses").select("track_id").eq("id", courseId).single();
  const { data: trackSkills } = await db.from("skills").select("id, lesson_skills(lesson_id)").eq("track_id", course?.track_id ?? "");
  for (const s of trackSkills ?? []) {
    if ((s.lesson_skills ?? []).length === 0) own.add(s.id);
  }
  const ids = [...own];
  const { data: links } = await db
    .from("skill_links")
    .select("from_skill_id, to_skill_id, link_type")
    .or(`from_skill_id.in.(${ids.join(",")}),to_skill_id.in.(${ids.join(",")})`);

  const allIds = new Set(ids);
  for (const l of links ?? []) {
    allIds.add(l.from_skill_id);
    allIds.add(l.to_skill_id);
  }

  const [{ data: skills }, { data: mastery }, { data: elsewhere }] = await Promise.all([
    db.from("skills").select("id, slug, name, description, tracks(zone_name)").in("id", [...allIds]),
    db.from("skill_mastery").select("skill_id, level").eq("student_id", studentId).in("skill_id", [...allIds]),
    db
      .from("lesson_skills")
      .select("skill_id, lessons!inner(missions!inner(courses!inner(title, short_title)))")
      .in("skill_id", [...allIds].filter((id) => !own.has(id))),
  ]);

  const courseOf = new Map<string, string>();
  for (const e of elsewhere ?? []) {
    const c = (e.lessons as unknown as { missions: { courses: { title: string; short_title: string | null } } }).missions.courses;
    courseOf.set(e.skill_id, c.short_title ?? c.title);
  }
  const masteryOf = new Map((mastery ?? []).map((m) => [m.skill_id, m.level as number]));

  return {
    skills: (skills ?? []).map(({ tracks, ...s }) => ({
      ...s,
      inCourse: own.has(s.id),
      courseTitle: own.has(s.id)
        ? null
        : (courseOf.get(s.id) ?? (tracks as unknown as { zone_name: string } | null)?.zone_name ?? "Another course"),
      mastery: masteryOf.get(s.id) ?? -1,
      lessons: lessonsBySkill.get(s.id) ?? [],
    })),
    links: (links ?? []).map((l) => ({ from: l.from_skill_id, to: l.to_skill_id, type: l.link_type as GraphLink["type"] })),
  };
}
