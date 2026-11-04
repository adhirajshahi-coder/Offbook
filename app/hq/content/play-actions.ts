"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/hq/audit";
import { gameConfigIssues, parseGameConfig } from "@/lib/play/games";
import { createClient } from "@/lib/supabase/server";

/**
 * Content Studio: challenges and game configs (PRD §10, §7.7, §7.9).
 * Written as the signed-in content editor; RLS enforces the role.
 */

export type Result = { ok: boolean; error?: string; message?: string; id?: string; issues?: string[] };

async function db() {
  await requireStaff(["content"]);
  return createClient();
}

const optionalId = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable());
const optionalDate = z.preprocess((v) => (v === "" ? null : v), z.iso.datetime({ offset: true }).nullable());

const challengeSchema = z
  .object({
    title: z.string().trim().min(3, "Add a title").max(120),
    type: z.enum(["challenge_week", "real_world", "sponsored"]),
    brief: z.string().trim().min(40, "The brief needs a few sentences").max(3000),
    safety_note: z.string().trim().min(20, "Every challenge needs a safety note").max(1000),
    rubric: z.array(z.string().trim().min(3).max(200)).min(1, "Add at least one rubric line").max(10),
    xp: z.coerce.number().int().min(0).max(500),
    track_id: optionalId,
    required_course_id: optionalId,
    band: z.preprocess((v) => (v === "" ? null : v), z.enum(["explore", "build", "launch"]).nullable()),
    starts_at: optionalDate,
    ends_at: optionalDate,
    parent_ack_required: z.boolean(),
    status: z.enum(["draft", "published", "archived"]),
  })
  .refine((v) => !v.starts_at || !v.ends_at || v.starts_at < v.ends_at, { message: "The end date must be after the start", path: ["ends_at"] });

export type ChallengeInput = z.input<typeof challengeSchema>;

export async function saveChallenge(id: string | null, input: ChallengeInput): Promise<Result> {
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await db();
  const row = parsed.data;
  if (row.type === "sponsored" && row.status === "published" && !/sponsor/i.test(row.brief)) {
    return { ok: false, error: "Sponsored challenges must say who the sponsor is in the brief." };
  }
  const q = id ? supabase.from("challenges").update(row).eq("id", id).select("id").single() : supabase.from("challenges").insert(row).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: "That didn't save. Try again." };
  await audit(id ? "challenge.update" : "challenge.create", "challenge", data.id, { status: row.status });
  revalidatePath("/hq/content/challenges");
  return { ok: true, message: "Saved.", id: data.id };
}

/** Save a game's JSON config after validating it against that game's schema. */
export async function saveGameConfig(slug: string, json: string, status: "draft" | "published"): Promise<Result> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: "That isn't valid JSON.", issues: [(e as Error).message] };
  }
  const issues = gameConfigIssues(slug, raw);
  if (issues === null) return { ok: false, error: "This game has no editor yet." };
  const game = parseGameConfig(slug, raw);
  if (issues.length || !game) return { ok: false, error: "The config has problems. Nothing was saved.", issues };
  const supabase = await db();
  const { error } = await supabase.from("games").update({ config: game.config, status }).eq("slug", slug);
  if (error) return { ok: false, error: "That didn't save. Try again." };
  await audit("game.config_update", "game", slug, { status });
  revalidatePath(`/hq/content/games/${slug}`);
  return { ok: true, message: status === "published" ? "Saved and live." : "Saved as draft." };
}
