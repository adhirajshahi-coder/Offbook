/**
 * Weekly leagues (PRD §7.8): cohorts of 20–30 students of one band and tier,
 * ranked by XP earned that IST week. Top 5 move up a tier, bottom 5 move
 * down. Pure, so rollover and the league screen agree.
 */

export const TIERS = ["bronze", "silver", "gold", "diamond"] as const;
export type Tier = (typeof TIERS)[number];
export type Outcome = "promoted" | "stayed" | "demoted";

export const LEAGUE_MIN = 20;
export const LEAGUE_MAX = 30;
export const MOVE_COUNT = 5;

export const TIER_LABEL: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", diamond: "Diamond" };

/**
 * Split a band+tier group into cohorts of LEAGUE_MIN–LEAGUE_MAX. A group
 * smaller than the minimum still gets one league (early days, small bands).
 */
export function cohortSizes(n: number): number[] {
  if (n <= 0) return [];
  if (n <= LEAGUE_MAX) return [n];
  const count = Math.ceil(n / LEAGUE_MAX);
  const base = Math.floor(n / count);
  const extra = n % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Who moves where: needs at least 2×MOVE_COUNT members to move anyone, so small leagues aren't punishing. */
export function outcomeFor(rank: number, size: number, tier: Tier): Outcome {
  const moves = size >= MOVE_COUNT * 2 ? MOVE_COUNT : Math.floor(size / 4);
  if (moves > 0 && rank <= moves && tier !== "diamond") return "promoted";
  if (moves > 0 && rank > size - moves && tier !== "bronze") return "demoted";
  return "stayed";
}

export function nextTier(tier: Tier, outcome: Outcome | null): Tier {
  const i = TIERS.indexOf(tier);
  if (outcome === "promoted") return TIERS[Math.min(TIERS.length - 1, i + 1)];
  if (outcome === "demoted") return TIERS[Math.max(0, i - 1)];
  return tier;
}

export type Standing = { studentId: string; xp: number };

/** Rank by weekly XP, ties broken by id so the order is stable. Ranks are 1-based. */
export function rankStandings<T extends Standing>(rows: T[]): (T & { rank: number })[] {
  return [...rows].sort((a, b) => b.xp - a.xp || a.studentId.localeCompare(b.studentId)).map((r, i) => ({ ...r, rank: i + 1 }));
}
