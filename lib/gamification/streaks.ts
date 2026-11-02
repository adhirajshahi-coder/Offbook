/**
 * Weekly-goal streaks (PRD §7.8): "learn N days this week", not a brittle
 * daily chain. Weeks run Monday to Sunday in India Standard Time.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY = 86_400_000;

/** Calendar date (YYYY-MM-DD) in IST. */
export function istDay(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The Monday (YYYY-MM-DD, IST) of the week containing `d`. */
export function istWeekStart(d: Date): string {
  const local = new Date(d.getTime() + IST_OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(local.getTime() - dow * DAY).toISOString().slice(0, 10);
}

export type StreakInfo = {
  /** Distinct active days this week. */
  daysThisWeek: number;
  goal: number;
  goalMetThisWeek: boolean;
  /** Consecutive weeks that met the goal, counting this week only if already met. */
  weeks: number;
  /** IST dates active this week, for the calendar. */
  activeDays: string[];
};

export function weeklyStreak(activity: Date[], goal: number, now: Date): StreakInfo {
  const daysByWeek = new Map<string, Set<string>>();
  for (const t of activity) {
    const week = istWeekStart(t);
    if (!daysByWeek.has(week)) daysByWeek.set(week, new Set());
    daysByWeek.get(week)!.add(istDay(t));
  }

  const thisWeek = istWeekStart(now);
  const thisDays = daysByWeek.get(thisWeek) ?? new Set<string>();
  const goalMet = thisDays.size >= goal;

  let weeks = goalMet ? 1 : 0;
  // Walk back from last week while each week met the goal.
  let cursor = new Date(`${thisWeek}T00:00:00Z`).getTime() - 7 * DAY;
  for (;;) {
    const key = new Date(cursor).toISOString().slice(0, 10);
    if ((daysByWeek.get(key)?.size ?? 0) >= goal) {
      weeks++;
      cursor -= 7 * DAY;
    } else break;
  }

  return { daysThisWeek: thisDays.size, goal, goalMetThisWeek: goalMet, weeks, activeDays: [...thisDays].sort() };
}
