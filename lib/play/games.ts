import "server-only";
import { budgetConfigSchema, type BudgetConfig } from "@/lib/games/budget-bazaar";
import { dojoConfigSchema, type DojoConfig } from "@/lib/games/decision-dojo";
import { istDay } from "@/lib/gamification/streaks";
import type { Student } from "@/lib/play/session";
import { loadWorld } from "@/lib/play/state";
import { createAdminClient } from "@/lib/supabase/server";

/** Games with a playable engine in this release; the rest show as coming soon. */
export const PLAYABLE = ["budget-bazaar", "decision-dojo"] as const;
export type PlayableSlug = (typeof PLAYABLE)[number];

export type GameConfig = { slug: "budget-bazaar"; config: BudgetConfig } | { slug: "decision-dojo"; config: DojoConfig };

export function parseGameConfig(slug: string, raw: unknown): GameConfig | null {
  if (slug === "budget-bazaar") {
    const p = budgetConfigSchema.safeParse(raw);
    return p.success ? { slug, config: p.data } : null;
  }
  if (slug === "decision-dojo") {
    const p = dojoConfigSchema.safeParse(raw);
    return p.success ? { slug, config: p.data } : null;
  }
  return null;
}

/** Readable problems with a config, for the HQ editor. Empty means valid; null means no editor for this game yet. */
export function gameConfigIssues(slug: string, raw: unknown): string[] | null {
  const schema = slug === "budget-bazaar" ? budgetConfigSchema : slug === "decision-dojo" ? dojoConfigSchema : null;
  if (!schema) return null;
  const r = schema.safeParse(raw);
  return r.success ? [] : r.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "config"}: ${i.message}`);
}

export function levelsOf(g: GameConfig): number[] {
  const levels = g.slug === "budget-bazaar" ? g.config.levels.map((l) => l.level) : g.config.scenarios.map((s) => s.level);
  return [...new Set(levels)].sort((a, b) => a - b);
}

export type GameCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  trackName: string;
  unlockCourse: { slug: string; title: string } | null;
  playable: boolean;
  unlocked: boolean;
  bestWonLevel: number;
  plays: number;
};

/** Start of today in IST, as an ISO timestamp, for the daily game XP cap. */
export function istDayStart(now: Date): string {
  return `${istDay(now)}T00:00:00+05:30`;
}

export async function gameXpToday(studentId: string, now = new Date()): Promise<number> {
  const db = createAdminClient();
  const { data } = await db.from("game_sessions").select("xp_awarded").eq("student_id", studentId).gte("finished_at", istDayStart(now));
  return (data ?? []).reduce((n, r) => n + r.xp_awarded, 0);
}

/**
 * A game opens once the student has reached its course (PRD §7.7): started,
 * waiting on review, previewing or done. Admin unlocks count via the engine.
 */
export async function loadGames(student: Student): Promise<GameCard[]> {
  const db = createAdminClient();
  const [world, games, sessions] = await Promise.all([
    loadWorld(student),
    db.from("games").select("id, slug, title, description, track_id, unlock_course_id, status").order("slug"),
    db.from("game_sessions").select("game_id, level, won").eq("student_id", student.id).eq("status", "finished"),
  ]);
  const trackName = new Map(world.tracks.map((t) => [t.id, t.zone_name]));
  const course = new Map(world.courses.map((c) => [c.id, c]));

  return (games.data ?? [])
    .filter((g) => g.status === "published" || !(PLAYABLE as readonly string[]).includes(g.slug))
    .map((g) => {
      const c = g.unlock_course_id ? course.get(g.unlock_course_id) : undefined;
      const state = g.unlock_course_id ? world.unlock.states[g.unlock_course_id] : "completed";
      const mine = (sessions.data ?? []).filter((s) => s.game_id === g.id);
      return {
        id: g.id,
        slug: g.slug,
        title: g.title,
        description: g.description,
        trackName: trackName.get(g.track_id) ?? "",
        unlockCourse: c ? { slug: c.slug, title: c.short_title ?? c.title } : null,
        playable: g.status === "published" && (PLAYABLE as readonly string[]).includes(g.slug),
        unlocked: state !== undefined && state !== "locked" && state !== "available",
        bestWonLevel: Math.max(0, ...mine.filter((s) => s.won).map((s) => s.level)),
        plays: mine.length,
      };
    })
    .sort((a, b) => Number(b.playable) - Number(a.playable) || a.title.localeCompare(b.title));
}

/** Levels open to play: level 1, then each one after a level is won. */
export function openLevels(levels: number[], bestWonLevel: number): number[] {
  return levels.filter((l, i) => i === 0 || levels[i - 1] <= bestWonLevel);
}
