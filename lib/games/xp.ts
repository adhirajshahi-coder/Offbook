/** Game XP (PRD §7.8): up to 50 per session, capped at 150 a day from games. */

export const GAME_SESSION_MAX = 50;
export const GAME_DAILY_CAP = 150;

export function gameSessionXp(r: { won: boolean; score: number; level: number }): number {
  const base = 10;
  const win = r.won ? 20 : 0;
  const skill = Math.min(20, Math.floor(r.score / 50) * 2 + (r.level - 1) * 4);
  return Math.min(GAME_SESSION_MAX, base + win + Math.max(0, skill));
}

export function capGameXp(earned: number, alreadyToday: number): number {
  return Math.max(0, Math.min(earned, GAME_DAILY_CAP - alreadyToday));
}
