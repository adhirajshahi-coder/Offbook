"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

/** The parent okays an offline challenge after reading its safety note (PRD §7.9). RLS limits this to their own children. */
export async function grantChallenge(input: { studentId: string; challengeId: string; acknowledged: boolean }): Promise<Result> {
  const parent = await requireParent();
  if (!input.acknowledged) return { ok: false, error: "Please confirm you've read the safety note." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_permissions")
    .update({ granted_at: new Date().toISOString(), granted_by: parent.id })
    .eq("student_id", input.studentId)
    .eq("challenge_id", input.challengeId)
    .is("granted_at", null)
    .select("challenge_id");
  if (error || !data?.length) return { ok: false, error: "Couldn't save that. Refresh and try again." };
  revalidatePath("/parent/activity");
  return { ok: true };
}

/** Take back a yes before the child has done the challenge. The request stays, waiting. */
export async function revokeChallenge(input: { studentId: string; challengeId: string }): Promise<Result> {
  await requireParent();
  const supabase = await createClient();
  const { error } = await supabase
    .from("challenge_permissions")
    .update({ granted_at: null, granted_by: null })
    .eq("student_id", input.studentId)
    .eq("challenge_id", input.challengeId);
  if (error) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/parent/activity");
  return { ok: true };
}

/** Turn the public portfolio page on (with a handle) or off (empty). Nothing shows there until items are also shared. */
export async function setPortfolioHandle(studentId: string, raw: string): Promise<Result> {
  await requireParent();
  const handle = raw.trim().toLowerCase();
  if (handle && !/^[a-z0-9-]{3,30}$/.test(handle)) return { ok: false, error: "Use 3–30 lowercase letters, numbers or dashes. Avoid full names." };
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ portfolio_handle: handle || null, public_portfolio: Boolean(handle) }).eq("id", studentId);
  if (error) return { ok: false, error: error.code === "23505" ? "That link is taken. Try another." : "Couldn't save that." };
  revalidatePath("/parent/activity");
  return { ok: true };
}

/** Per item: show on the public portfolio, and/or offer it to the Offbook Showcase (staff approve before it appears). */
export async function setItemSharing(itemId: string, input: { visibility: "private" | "portfolio"; showcaseConsent: boolean }): Promise<Result> {
  await requireParent();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .update({ visibility: input.visibility, showcase_consent: input.showcaseConsent })
    .eq("id", itemId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/parent/activity");
  return { ok: true };
}

/** Weekly leagues are off until a parent turns them on. Children see only first names and preset stickers. */
export async function setLeagueOptIn(studentId: string, on: boolean): Promise<Result> {
  await requireParent();
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ league_opt_in: on }).eq("id", studentId);
  if (error) return { ok: false, error: "Couldn't save that." };
  revalidatePath("/parent/activity");
  return { ok: true };
}
