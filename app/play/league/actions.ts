"use server";

import { sendReaction } from "@/lib/play/league";
import { STICKERS, type Sticker } from "@/lib/play/league-stickers";
import { studentOrThrow } from "@/lib/play/session";

/** Preset stickers only: no free text between children (PRD §13). */
export async function react(toStudentId: string, sticker: Sticker): Promise<{ ok: boolean }> {
  const student = await studentOrThrow();
  if (!student.league_opt_in || !STICKERS.includes(sticker)) return { ok: false };
  return { ok: await sendReaction(student.id, toStudentId, sticker) };
}
