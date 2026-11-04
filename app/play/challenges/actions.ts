"use server";

import { loadChallenges } from "@/lib/play/challenges";
import { studentOrThrow } from "@/lib/play/session";
import { isMeaningfulText, parseWorkLink } from "@/lib/questions";
import { createAdminClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

async function challengeFor(id: string) {
  const student = await studentOrThrow();
  const card = (await loadChallenges(student)).find((c) => c.id === id);
  if (!card) throw new Error("Challenge not found");
  return { student, card };
}

/** "Ask a parent": the request shows up in the Parent Zone to grant. */
export async function askParent(challengeId: string): Promise<Result> {
  const { student, card } = await challengeFor(challengeId);
  if (card.state === "locked") return { ok: false, error: "This challenge is still locked." };
  if (card.state !== "ask") return { ok: true };
  const db = createAdminClient();
  const { error } = await db
    .from("challenge_permissions")
    .upsert({ student_id: student.id, challenge_id: challengeId }, { onConflict: "student_id,challenge_id", ignoreDuplicates: true });
  return error ? { ok: false, error: "Couldn't send the request. Try again." } : { ok: true };
}

export async function submitChallenge(input: { challengeId: string; text: string; link?: string }): Promise<Result> {
  const { student, card } = await challengeFor(input.challengeId);
  if (card.state !== "ready" && card.state !== "revision") {
    return { ok: false, error: card.state === "submitted" ? "Already sent. A reviewer will reply soon." : "Ask a parent first." };
  }
  const text = input.text.trim();
  if (!isMeaningfulText(text, 60)) return { ok: false, error: "Tell us what you did and what you found out: a few sentences at least." };
  let link: string | null;
  try {
    link = parseWorkLink(input.link);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const db = createAdminClient();
  const { error } = await db.from("submissions").insert({
    student_id: student.id,
    kind: "challenge",
    challenge_id: card.id,
    content: { text: text.slice(0, 4000), link },
    status: "pending",
  });
  return error ? { ok: false, error: "Couldn't send it. Try again." } : { ok: true };
}
