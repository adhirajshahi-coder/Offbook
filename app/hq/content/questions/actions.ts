"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { checkAnswer, toRow, type Response } from "@/lib/questions";
import { createClient } from "@/lib/supabase/server";
import type { QuestionSeed } from "@/supabase/seed-data/lesson-types";

export type Result = { ok: boolean; error?: string; message?: string };

/** Start a new question group for a lesson (practice) or a mission (boss). */
export async function createGroup(formData: FormData) {
  await requireStaff(["content"]);
  const lessonId = String(formData.get("lesson") ?? "") || null;
  const missionId = String(formData.get("mission") ?? "") || null;
  if (!lessonId && !missionId) throw new Error("Choose a lesson or a mission");
  const key = `${missionId && !lessonId ? "boss" : "q"}-${randomBytes(4).toString("hex")}`;
  const supabase = await createClient();
  const { error } = await supabase.from("questions").insert({
    lesson_id: lessonId,
    mission_id: lessonId ? null : missionId,
    variant_group: key,
    status: "draft",
    ...toRow({ type: "multiple_choice", prompt: "New question", options: ["Option 1", "Option 2"], answer: 0, explanation: "", hint1: "", hint2: "", difficulty: 1 }),
    explanation: "",
    difficulty: 1,
  });
  if (error) throw new Error(error.message);
  redirect(`/hq/content/questions/group/${encodeURIComponent(key)}`);
}

export type VariantInput = { id: string | null; seed: QuestionSeed };

function problems(q: QuestionSeed, n: number): string | null {
  const where = `Variant ${n}`;
  if (!q.prompt.trim()) return `${where}: write the question.`;
  if (!q.explanation.trim()) return `${where}: add the "here's why" explanation.`;
  switch (q.type) {
    case "multiple_choice":
    case "scenario":
      if (q.options.filter((o) => o.trim()).length < 2) return `${where}: add at least two options.`;
      if (q.answer < 0 || q.answer >= q.options.length) return `${where}: pick the correct option.`;
      break;
    case "multi_select":
      if (q.options.filter((o) => o.trim()).length < 2) return `${where}: add at least two options.`;
      if (q.answer.length === 0) return `${where}: tick at least one correct option.`;
      break;
    case "order":
      if (q.items.filter((i) => i.trim()).length < 3) return `${where}: add at least three items.`;
      if (new Set(q.items).size !== q.items.length) return `${where}: items must be different.`;
      break;
    case "match_pairs":
      if (q.pairs.length < 2 || q.pairs.some(([l, r]) => !l.trim() || !r.trim())) return `${where}: fill in at least two complete pairs.`;
      if (new Set(q.pairs.map((p) => p[1])).size !== q.pairs.length) return `${where}: right-hand answers must be different.`;
      break;
    case "slider":
      if (!(q.min < q.max) || q.answer < q.min || q.answer > q.max || q.step <= 0) return `${where}: the answer must sit between min and max.`;
      break;
    case "short_answer":
      if (q.minLength < 1) return `${where}: set a minimum length.`;
      break;
  }
  // The stored answer must actually check as correct.
  const r = toRow(q);
  if (!checkAnswer({ type: r.type, options: r.options, answer: r.answer }, correctResponse(q))) {
    return `${where}: the correct answer doesn't check out. Look at it again.`;
  }
  return null;
}

/** The response a student would give to get this question right. */
function correctResponse(q: QuestionSeed): Response {
  switch (q.type) {
    case "multiple_choice":
    case "scenario":
      return { index: q.answer };
    case "multi_select":
      return { indexes: q.answer };
    case "order":
      return { order: q.items };
    case "match_pairs":
      return { pairs: Object.fromEntries(q.pairs) };
    case "slider":
      return { value: q.answer };
    case "short_answer":
      return { text: "a sample answer that is long enough to pass" + " x".repeat(q.minLength) };
  }
}

export async function saveGroup(
  key: string,
  input: { skillId: string | null; status: "draft" | "published"; variants: VariantInput[] },
): Promise<Result> {
  await requireStaff(["content"]);
  if (input.variants.length === 0) return { ok: false, error: "Keep at least one variant." };
  if (input.variants.length > 5) return { ok: false, error: "Up to 5 variants per group." };
  for (const [i, v] of input.variants.entries()) {
    const p = problems(v.seed, i + 1);
    if (p) return { ok: false, error: p };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("questions").select("id, lesson_id, mission_id").eq("variant_group", key);
  if (!existing?.length) return { ok: false, error: "Group not found." };
  const { lesson_id, mission_id } = existing[0];

  for (const v of input.variants) {
    const row = {
      ...toRow(v.seed),
      explanation: v.seed.explanation,
      hint1: v.seed.hint1 || null,
      hint2: v.seed.hint2 || null,
      difficulty: v.seed.difficulty,
      skill_id: input.skillId,
      status: input.status,
    };
    const { error } = v.id
      ? await supabase.from("questions").update(row).eq("id", v.id).eq("variant_group", key)
      : await supabase.from("questions").insert({ ...row, variant_group: key, lesson_id, mission_id });
    if (error) return { ok: false, error: "That didn't save. Try again." };
  }

  // Removed variants are archived, not deleted: past answers point at them.
  const keep = new Set(input.variants.filter((v) => v.id).map((v) => v.id));
  const removed = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (removed.length) await supabase.from("questions").update({ status: "archived" }).in("id", removed);

  revalidatePath(`/hq/content/questions/group/${key}`);
  revalidatePath("/hq/content/questions");
  return { ok: true, message: input.status === "published" ? "Saved and published." : "Saved as draft." };
}
