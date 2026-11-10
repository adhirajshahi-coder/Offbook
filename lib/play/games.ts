import "server-only";
import { configIssues, gameLevels, isGameSlug, parseConfig, PLAYABLE, type GameSlug } from "@/lib/games/registry";
import { istDay } from "@/lib/gamification/streaks";
import type { Student } from "@/lib/play/session";
import { loadWorld } from "@/lib/play/state";
import { createAdminClient } from "@/lib/supabase/server";

export { PLAYABLE };

export type GameConfig = { slug: GameSlug; config: unknown };

export function parseGameConfig(slug: string, raw: unknown): GameConfig | null {
  if (!isGameSlug(slug)) return null;
  const config = parseConfig(slug, raw);
  return config === null ? null : { slug, config };
}

/** Readable problems with a config, for the HQ editor. Empty means valid; null means no editor for this game yet. */
export function gameConfigIssues(slug: string, raw: unknown): string[] | null {
  return configIssues(slug, raw);
}

export function levelsOf(g: GameConfig): number[] {
  return gameLevels(g.slug, g.config).map((l) => l.level);
}

export function levelTitles(g: GameConfig): Map<number, string> {
  return new Map(gameLevels(g.slug, g.config).map((l) => [l.level, l.title]));
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
    .filter((g) => g.status === "published" || !isGameSlug(g.slug))
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
        playable: g.status === "published" && isGameSlug(g.slug),
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
