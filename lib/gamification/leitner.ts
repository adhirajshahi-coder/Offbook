/**
 * Retry Vault (PRD §7.6): every missed question goes into a Leitner box and
 * resurfaces after 1, 3, 7 and 14 days. Correct in a warm-up moves it up a
 * box; a miss sends it back to box 1. Past box 4 it's learned and retired.
 */

export const BOX_INTERVAL_DAYS = [1, 3, 7, 14] as const; // boxes 1–4
export const RETIRE_AFTER_BOX = 4;
const DAY = 86_400_000;

export type VaultEntry = { box: number; dueAt: Date };

/** A question was missed (in a lesson, quiz or warm-up). */
export function onMiss(now: Date): VaultEntry {
  return { box: 1, dueAt: new Date(now.getTime() + BOX_INTERVAL_DAYS[0] * DAY) };
}

/** Answered correctly in a warm-up. Returns null when the question is retired. */
export function onCorrect(entry: { box: number }, now: Date): VaultEntry | null {
  const next = entry.box + 1;
  if (next > RETIRE_AFTER_BOX) return null;
  return { box: next, dueAt: new Date(now.getTime() + BOX_INTERVAL_DAYS[next - 1] * DAY) };
}

export function isDue(entry: { dueAt: Date }, now: Date): boolean {
  return entry.dueAt.getTime() <= now.getTime();
}

/** Daily warm-up picks 3–5 due questions, most overdue and lowest box first. */
export function pickWarmup<T extends { box: number; dueAt: Date }>(entries: T[], now: Date, max = 5): T[] {
  return entries
    .filter((e) => isDue(e, now))
    .sort((a, b) => a.box - b.box || a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, max);
}
