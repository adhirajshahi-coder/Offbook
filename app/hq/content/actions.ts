"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/hq/audit";
import { canPublish, lessonChecks, type EditorStep } from "@/lib/hq/lesson-validation";
import { createClient } from "@/lib/supabase/server";

/**
 * Content Studio writes (PRD §10). Run as the signed-in staff member, so
 * RLS ("content team writes") enforces the role in Postgres as well.
 */

export type Result = { ok: boolean; error?: string; message?: string };

const status = z.enum(["draft", "published", "archived"]);

async function db() {
  await requireStaff(["content"]);
  return createClient();
}

function fail(error: { message: string } | null, fallback = "That didn't save. Try again."): Result {
  if (!error) return { ok: true, message: "Saved." };
  console.error(error.message);
  return { ok: false, error: fallback };
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

const courseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  short_title: z.string().trim().max(40).optional(),
  promise: z.string().trim().min(10, "Write a one-line promise").max(200),
  capstone: z.string().trim().max(1000),
  cohort: z.string().trim().max(1000).optional(),
  status,
});

export async function updateCourse(id: string, input: z.input<typeof courseSchema>): Promise<Result> {
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await db();
  const v = parsed.data;
  const { error } = await supabase
    .from("courses")
    .update({
      title: v.title,
      short_title: v.short_title || null,
      promise: v.promise,
      capstone: { brief: v.capstone },
      cohort_variant: v.cohort ? { brief: v.cohort } : null,
      status: v.status,
    })
    .eq("id", id);
  revalidatePath(`/hq/content/courses/${id}`);
  return fail(error);
}

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

export async function createMission(courseId: string): Promise<Result & { id?: string }> {
  const supabase = await db();
  const { data: last } = await supabase.from("missions").select("order_index").eq("course_id", courseId).order("order_index", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("missions")
    .insert({ course_id: courseId, order_index: (last?.order_index ?? 0) + 1, title: "New mission", output_description: "", status: "draft" })
    .select("id")
    .single();
  revalidatePath(`/hq/content/courses/${courseId}`);
  return error ? fail(error) : { ok: true, id: data.id };
}

const missionSchema = z.object({
  title: z.string().trim().min(3).max(120),
  output_description: z.string().trim().max(300),
  status,
  boss_title: z.string().trim().max(120),
  boss_intro: z.string().trim().max(500),
  boss_pass_pct: z.coerce.number().int().min(50).max(100),
});

export async function updateMission(id: string, input: z.input<typeof missionSchema>): Promise<Result> {
  const parsed = missionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await db();
  const v = parsed.data;
  if (v.status === "published") {
    const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("mission_id", id).eq("status", "published");
    if (!count) return { ok: false, error: "Publish at least one lesson before publishing the mission." };
  }
  const { error } = await supabase
    .from("missions")
    .update({
      title: v.title,
      output_description: v.output_description,
      status: v.status,
      boss_config: { title: v.boss_title, intro: v.boss_intro, passPct: v.boss_pass_pct },
    })
    .eq("id", id);
  revalidatePath(`/hq/content/missions/${id}`);
  return fail(error);
}

/** Swap positions with the neighbour. Two-step to respect the unique order constraint. */
async function swapOrder(table: "missions" | "lessons", parentCol: "course_id" | "mission_id", id: string, dir: -1 | 1): Promise<Result> {
  const supabase = await db();
  const { data: row } = await supabase.from(table).select(`id, order_index, ${parentCol}`).eq("id", id).single();
  if (!row) return { ok: false, error: "Not found" };
  const parent = (row as Record<string, string>)[parentCol];
  const { data: sibling } = await supabase
    .from(table)
    .select("id, order_index")
    .eq(parentCol, parent)
    [dir < 0 ? "lt" : "gt"]("order_index", row.order_index)
    .order("order_index", { ascending: dir > 0 })
    .limit(1)
    .maybeSingle();
  if (!sibling) return { ok: true };
  const a = await supabase.from(table).update({ order_index: -1 }).eq("id", row.id);
  const b = await supabase.from(table).update({ order_index: row.order_index }).eq("id", sibling.id);
  const c = await supabase.from(table).update({ order_index: sibling.order_index }).eq("id", row.id);
  return fail(a.error ?? b.error ?? c.error);
}

export async function moveMission(id: string, courseId: string, dir: -1 | 1) {
  const r = await swapOrder("missions", "course_id", id, dir);
  revalidatePath(`/hq/content/courses/${courseId}`);
  return r;
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export async function createLesson(missionId: string): Promise<Result & { id?: string }> {
  const supabase = await db();
  const { data: last } = await supabase.from("lessons").select("order_index").eq("mission_id", missionId).order("order_index", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("lessons")
    .insert({ mission_id: missionId, order_index: (last?.order_index ?? 0) + 1, title: "New lesson", summary: "", est_minutes: 10, status: "draft" })
    .select("id")
    .single();
  revalidatePath(`/hq/content/missions/${missionId}`);
  return error ? fail(error) : { ok: true, id: data.id };
}

export async function moveLesson(id: string, missionId: string, dir: -1 | 1) {
  const r = await swapOrder("lessons", "mission_id", id, dir);
  revalidatePath(`/hq/content/missions/${missionId}`);
  return r;
}

const stepSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().nullable(), type: z.literal("study_deck"), content: z.object({ label: z.string().optional(), cards: z.array(z.object({ title: z.string().max(80), body: z.string().max(400), visual: z.string() })).max(12) }) }),
  z.object({ id: z.string().nullable(), type: z.literal("practice"), content: z.object({ label: z.string().optional(), groups: z.array(z.string()).max(10) }) }),
  z.object({ id: z.string().nullable(), type: z.literal("video"), content: z.object({ label: z.string().optional(), video_id: z.string().nullable(), start_sec: z.number().int().min(0).nullable().optional(), end_sec: z.number().int().min(0).nullable().optional(), min_watch_pct: z.number().int().min(0).max(100).optional() }) }),
  z.object({ id: z.string().nullable(), type: z.literal("make"), content: z.object({ prompt: z.string().max(600), rubric: z.array(z.string().max(160)).max(6) }) }),
  z.object({ id: z.string().nullable(), type: z.literal("reflect"), content: z.object({ prompt: z.string().max(200) }) }),
]);

export type SaveLessonInput = {
  title: string;
  summary: string;
  est_minutes: number;
  steps: EditorStep[];
  skillIds: string[];
  publish?: "publish" | "unpublish";
};

async function liveGroupsAndVideos(supabase: Awaited<ReturnType<typeof createClient>>, steps: EditorStep[]) {
  const groups = steps.flatMap((s) => (s.type === "practice" ? s.content.groups : []));
  const videoIds = steps.flatMap((s) => (s.type === "video" && s.content.video_id ? [s.content.video_id] : []));
  const [{ data: qs }, { data: vids }] = await Promise.all([
    groups.length ? supabase.from("questions").select("variant_group").in("variant_group", groups).eq("status", "published") : Promise.resolve({ data: [] as { variant_group: string }[] }),
    videoIds.length ? supabase.from("videos").select("id").in("id", videoIds).eq("status", "ready") : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  return {
    liveGroups: new Set((qs ?? []).map((q) => q.variant_group as string)),
    readyVideos: new Set((vids ?? []).map((v) => v.id as string)),
  };
}

export async function saveLesson(id: string, input: SaveLessonInput): Promise<Result> {
  const supabase = await db();
  const steps = z.array(stepSchema).max(20).safeParse(input.steps);
  if (!steps.success) return { ok: false, error: "One of the steps has something missing or too long." };
  const title = input.title.trim().slice(0, 120);
  const summary = input.summary.trim().slice(0, 400);
  if (!title) return { ok: false, error: "Give the lesson a title." };

  const { data: lesson } = await supabase.from("lessons").select("mission_id, status").eq("id", id).single();
  if (!lesson) return { ok: false, error: "Lesson not found." };

  let nextStatus = lesson.status as string;
  // A live lesson must stay valid: saving it runs the same checks as publishing.
  const mustValidate = input.publish === "publish" || (lesson.status === "published" && input.publish !== "unpublish");
  if (mustValidate) {
    const { liveGroups, readyVideos } = await liveGroupsAndVideos(supabase, steps.data as EditorStep[]);
    const checks = lessonChecks({ title, summary, steps: steps.data as EditorStep[], skillCount: input.skillIds.length, liveGroups, readyVideos });
    if (!canPublish(checks)) {
      const missing = checks.filter((c) => !c.ok).map((c) => c.label.toLowerCase()).join("; ");
      return {
        ok: false,
        error: lesson.status === "published" ? `Students can see this lesson, so it must stay complete: ${missing}. Fix that, or unpublish first.` : `Can't publish yet: ${missing}.`,
      };
    }
    nextStatus = "published";
  } else if (input.publish === "unpublish") {
    nextStatus = "draft";
  }

  const { error: lessonError } = await supabase
    .from("lessons")
    .update({ title, summary, est_minutes: Math.max(1, Math.min(30, Math.round(input.est_minutes))), status: nextStatus })
    .eq("id", id);
  if (lessonError) return fail(lessonError);

  // Steps: keep ids (progress points at them), delete removed ones, then
  // renumber in two passes to respect the unique (lesson, order) key.
  const { data: existing } = await supabase.from("lesson_steps").select("id").eq("lesson_id", id);
  const keep = new Set(steps.data.filter((s) => s.id).map((s) => s.id as string));
  const removed = (existing ?? []).filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (removed.length) {
    const { error } = await supabase.from("lesson_steps").delete().in("id", removed);
    if (error) return fail(error);
  }
  for (const [i, s] of steps.data.entries()) {
    if (s.id) await supabase.from("lesson_steps").update({ order_index: 1000 + i }).eq("id", s.id);
  }
  for (const [i, s] of steps.data.entries()) {
    const row = { order_index: i + 1, type: s.type, content: { type: s.type, ...s.content } };
    const { error } = s.id
      ? await supabase.from("lesson_steps").update(row).eq("id", s.id)
      : await supabase.from("lesson_steps").insert({ lesson_id: id, ...row });
    if (error) return fail(error);
  }

  // Skills
  await supabase.from("lesson_skills").delete().eq("lesson_id", id);
  if (input.skillIds.length) {
    const { error } = await supabase.from("lesson_skills").insert(input.skillIds.map((skill_id) => ({ lesson_id: id, skill_id })));
    if (error) return fail(error);
  }

  if (input.publish) await audit(input.publish === "publish" ? "lesson.publish" : "lesson.unpublish", "lesson", id, { title });
  revalidatePath(`/hq/content/lessons/${id}`);
  revalidatePath(`/hq/content/missions/${lesson.mission_id}`);
  return { ok: true, message: input.publish === "publish" ? "Published. Students see it now." : input.publish === "unpublish" ? "Moved back to draft." : "Saved." };
}
