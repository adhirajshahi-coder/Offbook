"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/hq/audit";
import { createClient } from "@/lib/supabase/server";

/** CRM settings (PRD §12.1–§12.2): admin only, enforced by RLS too. */

type Result = { ok: boolean; error?: string; message?: string };

async function admin() {
  await requireStaff([]);
  return createClient();
}

const stageSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Every stage needs a name").max(60),
  probability: z.coerce.number().int().min(0).max(100),
  outcome: z.enum(["open", "won", "lost"]),
});

const pipelineSchema = z.object({
  name: z.string().trim().min(1).max(60),
  stale_days: z.coerce.number().int().min(1).max(365),
  stages: z.array(stageSchema).min(2, "A pipeline needs at least two stages").max(15),
});

/** Save a pipeline's stages in order. Stages with deals can be renamed and reordered, not deleted. */
export async function savePipeline(pipelineId: string, input: z.input<typeof pipelineSchema>): Promise<Result> {
  const parsed = pipelineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (!v.stages.some((s) => s.outcome === "won")) return { ok: false, error: "Add at least one Won stage." };
  const supabase = await admin();

  const { data: existing } = await supabase.from("pipeline_stages").select("id").eq("pipeline_id", pipelineId);
  const keep = new Set(v.stages.map((s) => s.id).filter(Boolean));
  const removed = (existing ?? []).map((s) => s.id).filter((id) => !keep.has(id));
  if (removed.length) {
    const { count } = await supabase.from("deals").select("id", { count: "exact", head: true }).in("stage_id", removed);
    if (count) return { ok: false, error: `Move the ${count} deal${count === 1 ? "" : "s"} out of removed stages first.` };
    await supabase.from("pipeline_stages").delete().in("id", removed);
  }

  // Park existing stages at high indexes, then write the final order (unique index on order).
  for (const [i, s] of v.stages.entries()) if (s.id) await supabase.from("pipeline_stages").update({ order_index: 100 + i }).eq("id", s.id);
  for (const [i, s] of v.stages.entries()) {
    const row = { name: s.name, probability: s.probability, outcome: s.outcome, order_index: i };
    const { error } = s.id ? await supabase.from("pipeline_stages").update(row).eq("id", s.id) : await supabase.from("pipeline_stages").insert({ ...row, pipeline_id: pipelineId });
    if (error) return { ok: false, error: "Couldn't save the stages." };
  }
  await supabase.from("pipelines").update({ name: v.name, stale_days: v.stale_days }).eq("id", pipelineId);
  await audit("crm.pipeline_update", "pipeline", pipelineId, { stages: v.stages.length, stale_days: v.stale_days });
  revalidatePath("/hq/settings/pipelines");
  return { ok: true, message: "Pipeline saved." };
}

const fieldSchema = z.object({
  object: z.enum(["contact", "organization", "deal", "family"]),
  label: z.string().trim().min(1, "Add a label").max(60),
  type: z.enum(["text", "number", "date", "select", "multi_select", "url"]),
  options: z.array(z.string().trim().min(1).max(60)).max(30),
});

export async function addCustomField(input: z.input<typeof fieldSchema>): Promise<Result> {
  const parsed = fieldSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  if ((v.type === "select" || v.type === "multi_select") && v.options.length < 2) return { ok: false, error: "Add at least two options." };
  const key = v.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "f_$1").slice(0, 40) || "field";
  const supabase = await admin();
  const { count } = await supabase.from("custom_fields").select("id", { count: "exact", head: true }).eq("object", v.object);
  const { error } = await supabase.from("custom_fields").insert({ ...v, key: /^[a-z]/.test(key) ? key : `f_${key}`, options: v.type.includes("select") ? v.options : [], order_index: count ?? 0 });
  if (error) return { ok: false, error: error.code === "23505" ? "A field with that name already exists." : "Couldn't add the field." };
  await audit("crm.field_add", "custom_field", null, { object: v.object, label: v.label, type: v.type });
  revalidatePath("/hq/settings/fields");
  return { ok: true, message: "Field added." };
}

export async function deleteCustomField(id: string): Promise<Result> {
  const supabase = await admin();
  const { error } = await supabase.from("custom_fields").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete." };
  await audit("crm.field_delete", "custom_field", id);
  revalidatePath("/hq/settings/fields");
  return { ok: true, message: "Field removed. Values already saved stay on records but are hidden." };
}
