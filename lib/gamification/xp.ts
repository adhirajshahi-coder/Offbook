/**
 * XP, levels and ranks (PRD §7.8). Pure: the xp_events ledger is the source
 * of truth and these functions recompute everything from it.
 */

/** Default XP table. Editable in HQ settings later; values here are the fallback. */
export const XP = {
  stepFirstTime: 10,
  perfectTry: 5,
  bounceBack: 5,
  lessonComplete: 30,
  quizPassed: 60,
  bossBeaten: 100,
  missionComplete: 100,
  projectApproved: 150,
  warmup: 20,
  replay: 0,
} as const;

export const MAX_LEVEL = 50;

/** XP needed to go from `level` to `level + 1`: 100 + 40 × (level − 1). */
export function xpToNext(level: number): number {
  return 100 + 40 * (level - 1);
}

/** Total XP needed to reach `level` from level 1. */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < Math.min(level, MAX_LEVEL); l++) total += xpToNext(l);
  return total;
}

export type LevelInfo = { level: number; intoLevel: number; needed: number; pct: number };

export function levelForXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  if (level === MAX_LEVEL) return { level, intoLevel: 0, needed: 0, pct: 100 };
  const needed = xpToNext(level);
  return { level, intoLevel: remaining, needed, pct: Math.round((remaining / needed) * 100) };
}

/** Rank ladder (PRD §7.8 [ASSUMPTION]). Rank rises only when a course is completed. */
export const RANKS = ["rookie", "explorer", "builder", "maker", "pioneer", "founder", "legend"] as const;
export type Rank = (typeof RANKS)[number];

export const RANK_LABEL: Record<Rank, string> = {
  rookie: "Rookie",
  explorer: "Explorer",
  builder: "Builder",
  maker: "Maker",
  pioneer: "Pioneer",
  founder: "Founder",
  legend: "Legend",
};

/**
 * Courses needed for each rank. Level 1 has 13 courses, so a student who
 * finishes it lands around Pioneer; Legend takes most of the journey.
 */
export const RANK_THRESHOLDS: Record<Rank, number> = {
  rookie: 0,
  explorer: 1,
  builder: 3,
  maker: 6,
  pioneer: 10,
  founder: 16,
  legend: 24,
};

export function rankForCompletedCourses(completed: number): Rank {
  let rank: Rank = "rookie";
  for (const r of RANKS) if (completed >= RANK_THRESHOLDS[r]) rank = r;
  return rank;
}

export function rankIndex(rank: string): number {
  const i = RANKS.indexOf(rank as Rank);
  return i < 0 ? 0 : i;
}

/** XP for finishing a practice step, given how it went. */
export function practiceStepXp(opts: { firstTime: boolean; mistakes: number; bounceBacks: number; hintsUsed: number }): number {
  if (!opts.firstTime) return XP.replay;
  let xp = XP.stepFirstTime;
  // Perfect Try: no mistakes. Hints only reduce the bonus, never block progress.
  if (opts.mistakes === 0) xp += opts.hintsUsed === 0 ? XP.perfectTry : Math.max(0, XP.perfectTry - opts.hintsUsed * 2);
  xp += Math.min(opts.bounceBacks, 3) * XP.bounceBack;
  return xp;
}
