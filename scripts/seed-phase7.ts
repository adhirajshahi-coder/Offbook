import type { SupabaseClient } from "@supabase/supabase-js";
import { BRIDGE } from "../supabase/seed-data/curriculum";
import { CODING_STARTERS } from "../supabase/seed-data/content/coding-starters";
import { SKELETONS } from "../supabase/seed-data/skeletons";

/**
 * Phase 7 seed: Level 2/3 skeleton missions (drafts), one starter coding
 * lesson per coding course, and the Bridge course built from Level 1
 * lessons. Safe to re-run: existing missions and lessons edited in HQ are
 * left alone.
 */

function must<T>(label: string, r: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data as NonNullable<T>;
}

async function courseIds(db: SupabaseClient) {
  const { data } = await db.from("courses").select("id, slug, track_id, title, short_title");
  return new Map((data ?? []).map((c) => [c.slug, c as { id: string; track_id: string; title: string; short_title: string | null }]));
}

/** Insert missions that don't exist yet; never overwrite what HQ changed. */
async function ensureMissions(db: SupabaseClient, courseId: string, outlines: { title: string; output: string }[]) {
  const { data: existing } = await db.from("missions").select("order_index").eq("course_id", courseId);
  const have = new Set((existing ?? []).map((m) => m.order_index));
  const rows = outlines.map((m, i) => ({ course_id: courseId, order_index: i + 1, title: m.title, output_description: m.output, boss_config: {}, status: "draft" })).filter((r) => !have.has(r.order_index));
  if (rows.length) must("skeleton missions", await db.from("missions").insert(rows));
  return rows.length;
}

export async function seedSkeletons(db: SupabaseClient) {
  const course = await courseIds(db);
  let created = 0;
  for (const [slug, outlines] of Object.entries(SKELETONS)) {
    const c = course.get(slug);
    if (!c) throw new Error(`Unknown course ${slug}`);
    created += await ensureMissions(db, c.id, outlines);
  }
  console.log(`✓ Level 2/3 skeletons: ${Object.keys(SKELETONS).length} courses, ${created} new draft missions`);
}

export async function seedCodingStarters(db: SupabaseClient) {
  const course = await courseIds(db);
  for (const s of CODING_STARTERS) {
    const c = course.get(s.courseSlug);
    if (!c) throw new Error(`Unknown course ${s.courseSlug}`);
    await ensureMissions(db, c.id, [s.mission]);
    const { data: mission } = await db.from("missions").select("id, status").eq("course_id", c.id).eq("order_index", 1).single();
    if (!mission) continue;
    if (mission.status === "draft") await db.from("missions").update({ status: "published" }).eq("id", mission.id);

    const skills = must("skills", await db.from("skills").upsert(s.skills.map((k) => ({ ...k, track_id: c.track_id })), { onConflict: "slug" }).select("id"));
    const { data: existing } = await db.from("lessons").select("id").eq("mission_id", mission.id).eq("order_index", 1).maybeSingle();
    if (existing) continue; // edited in HQ since: leave it
    const lesson = must(
      "starter lesson",
      await db.from("lessons").insert({ mission_id: mission.id, order_index: 1, title: s.lesson.title, summary: s.lesson.summary, est_minutes: s.lesson.estMinutes, status: "published" }).select("id").single(),
    ) as { id: string };
    const steps = [
      { type: "study_deck", content: { label: "Study", cards: s.lesson.deck } },
      ...s.lesson.code.map((k) => ({ type: k.type, content: k.content })),
      { type: "reflect", content: { prompt: s.lesson.reflect } },
    ].map((st, i) => ({ lesson_id: lesson.id, order_index: i + 1, ...st }));
    must("starter steps", await db.from("lesson_steps").insert(steps));
    must("starter skills", await db.from("lesson_skills").insert(skills.map((k) => ({ lesson_id: lesson.id, skill_id: k.id }))));
  }
  console.log(`✓ ${CODING_STARTERS.length} starter coding lessons (Blocks, Python, Web, SQL)`);
}

/**
 * The Bridge (curriculum mapping §3): copies of Level 1 missions for students
 * who join in classes 9–12. Lessons, steps and questions are copied (with
 * their own variant groups) because lessons belong to one mission and quizzes
 * draw from a mission's lessons. Missions whose source has no content yet are
 * added as drafts and fill in on a later seed.
 */
export async function seedBridge(db: SupabaseClient) {
  const course = await courseIds(db);
  const bridge = course.get(BRIDGE.slug);
  if (!bridge) throw new Error("Bridge course missing");
  let order = 0;
  let copied = 0;
  for (const part of BRIDGE.fromCourses) {
    const src = course.get(part.course);
    for (const n of part.missions) {
      order++;
      const { data: source } = src
        ? await db.from("missions").select("id, title, output_description, boss_config, status").eq("course_id", src.id).eq("order_index", n).maybeSingle()
        : { data: null };
      const { data: lessons } = source ? await db.from("lessons").select("id, order_index, title, summary, est_minutes, status").eq("mission_id", source.id).eq("status", "published").order("order_index") : { data: [] };
      const ready = Boolean(source && source.status === "published" && lessons?.length);

      const { data: existing } = await db.from("missions").select("id, status").eq("course_id", bridge.id).eq("order_index", order).maybeSingle();
      const title = source?.title ?? `${src?.short_title ?? src?.title ?? part.course} essentials`;
      let missionId = existing?.id as string | undefined;
      if (!missionId) {
        missionId = (must("bridge mission", await db.from("missions").insert({ course_id: bridge.id, order_index: order, title, output_description: source?.output_description ?? "", boss_config: source?.boss_config ?? {}, status: ready ? "published" : "draft" }).select("id").single()) as { id: string }).id;
      } else if (!ready || existing?.status !== "draft") {
        if (!ready && existing?.status === "draft") await db.from("missions").update({ title }).eq("id", missionId);
        continue; // already built (or still waiting for source content)
      } else {
        await db.from("missions").update({ title, output_description: source!.output_description, boss_config: source!.boss_config, status: "published" }).eq("id", missionId);
      }
      if (!ready) continue;

      // Boss questions
      const { data: boss } = await db.from("questions").select("*").eq("mission_id", source!.id);
      if (boss?.length) {
        must("bridge boss", await db.from("questions").upsert(boss.map((q) => copyQuestion(q, { mission_id: missionId, lesson_id: null })), { onConflict: "seed_key" }));
      }
      for (const l of lessons ?? []) {
        const { data: lesson } = await db
          .from("lessons")
          .upsert({ mission_id: missionId, order_index: l.order_index, title: l.title, summary: l.summary, est_minutes: l.est_minutes, status: "published" }, { onConflict: "mission_id,order_index" })
          .select("id")
          .single();
        if (!lesson) continue;
        const [{ data: steps }, { data: qs }, { data: skills }] = await Promise.all([
          db.from("lesson_steps").select("order_index, type, content").eq("lesson_id", l.id),
          db.from("questions").select("*").eq("lesson_id", l.id),
          db.from("lesson_skills").select("skill_id").eq("lesson_id", l.id),
        ]);
        await db.from("lesson_steps").upsert(
          (steps ?? []).map((s) => ({
            lesson_id: lesson.id,
            order_index: s.order_index,
            type: s.type,
            content: s.type === "practice" ? { ...s.content, groups: ((s.content as { groups?: string[] }).groups ?? []).map((g) => `bridge:${g}`) } : s.content,
          })),
          { onConflict: "lesson_id,order_index" },
        );
        if (qs?.length) must("bridge questions", await db.from("questions").upsert(qs.map((q) => copyQuestion(q, { lesson_id: lesson.id, mission_id: null })), { onConflict: "seed_key" }));
        if (skills?.length) await db.from("lesson_skills").upsert(skills.map((k) => ({ lesson_id: lesson.id, skill_id: k.skill_id })), { onConflict: "lesson_id,skill_id", ignoreDuplicates: true });
        copied++;
      }
    }
  }
  await db.from("courses").update({ capstone: { brief: "Make a one-page 'starter kit' for a younger student: one online-safety rule, one money tip and one study trick, each with an example from your life." } }).eq("id", bridge.id);
  console.log(`✓ Bridge: ${order} missions, ${copied} lessons copied from Level 1`);
}

function copyQuestion(q: Record<string, unknown>, place: { lesson_id: string | null; mission_id: string | null }) {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = q;
  void _id;
  void _c;
  void _u;
  return { ...rest, ...place, seed_key: `bridge:${q.seed_key ?? q.id}`, variant_group: q.variant_group ? `bridge:${q.variant_group}` : null };
}
