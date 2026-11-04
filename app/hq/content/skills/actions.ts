"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: boolean; error?: string; message?: string };

async function db() {
  await requireStaff(["content"]);
  return createClient();
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

export async function createSkill(input: { trackId: string; name: string; description: string }): Promise<Result> {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Name the skill." };
  const supabase = await db();
  const { error } = await supabase.from("skills").insert({ track_id: input.trackId, name, description: input.description.trim(), slug: slugify(name) });
  revalidatePath("/hq/content/skills");
  if (error) return { ok: false, error: error.code === "23505" ? "A skill with that name already exists." : "That didn't save." };
  return { ok: true, message: "Skill added." };
}

export async function updateSkill(id: string, input: { name: string; description: string }): Promise<Result> {
  if (input.name.trim().length < 2) return { ok: false, error: "Name the skill." };
  const supabase = await db();
  const { error } = await supabase.from("skills").update({ name: input.name.trim(), description: input.description.trim() }).eq("id", id);
  revalidatePath("/hq/content/skills");
  return error ? { ok: false, error: "That didn't save." } : { ok: true, message: "Saved." };
}

export async function addLink(input: { from: string; to: string; type: "prerequisite" | "related" | "applies_in" }): Promise<Result> {
  if (!input.from || !input.to || input.from === input.to) return { ok: false, error: "Pick two different skills." };
  const supabase = await db();
  if (input.type === "prerequisite") {
    // Refuse a cycle: `to` must not already lead back to `from`.
    const { data: links } = await supabase.from("skill_links").select("from_skill_id, to_skill_id").eq("link_type", "prerequisite");
    const next = new Map<string, string[]>();
    for (const l of links ?? []) next.set(l.from_skill_id, [...(next.get(l.from_skill_id) ?? []), l.to_skill_id]);
    const stack = [input.to];
    const seen = new Set<string>();
    while (stack.length) {
      const s = stack.pop()!;
      if (s === input.from) return { ok: false, error: "That would make a loop: the second skill already leads to the first." };
      if (seen.has(s)) continue;
      seen.add(s);
      stack.push(...(next.get(s) ?? []));
    }
  }
  const { error } = await supabase.from("skill_links").insert({ from_skill_id: input.from, to_skill_id: input.to, link_type: input.type });
  revalidatePath("/hq/content/skills");
  if (error) return { ok: false, error: error.code === "23505" ? "That link already exists." : "That didn't save." };
  return { ok: true, message: "Link added." };
}

export async function removeLink(input: { from: string; to: string; type: string }): Promise<Result> {
  const supabase = await db();
  const { error } = await supabase.from("skill_links").delete().eq("from_skill_id", input.from).eq("to_skill_id", input.to).eq("link_type", input.type);
  revalidatePath("/hq/content/skills");
  return error ? { ok: false, error: "That didn't work." } : { ok: true, message: "Removed." };
}
