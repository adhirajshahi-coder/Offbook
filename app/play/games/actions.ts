"use server";

import { replay } from "@/lib/games/registry";
import { capGameXp, gameSessionXp } from "@/lib/games/xp";
import { gameXpToday, levelsOf, loadGames, openLevels, parseGameConfig } from "@/lib/play/games";
import { awardXp, refreshTotals } from "@/lib/play/progress";
import { studentOrThrow } from "@/lib/play/session";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Games run in the browser from a server-issued seed. When a run ends the
 * browser sends only the player's inputs; the server replays them through
 * the same pure engine to get the result, so scores can't be made up.
 * XP: up to 50 a session, 150 a day from games (PRD §7.8).
 */

async function openGame(slug: string) {
  const student = await studentOrThrow();
  const db = createAdminClient();
  const [games, { data }] = await Promise.all([loadGames(student), db.from("games").select("config").eq("slug", slug).single()]);
  const card = games.find((g) => g.slug === slug);
  if (!card || !card.playable) throw new Error("Game not found");
  if (!card.unlocked) throw new Error("This game is still locked");
  const game = parseGameConfig(slug, data?.config);
  if (!game) throw new Error("This game isn't set up yet");
  return { student, card, game };
}

export async function startGame(slug: string, level: number): Promise<{ sessionId: string; seed: number; level: number }> {
  const { student, card, game } = await openGame(slug);
  if (!openLevels(levelsOf(game), card.bestWonLevel).includes(level)) throw new Error("Win the level before to open this one");
  const seed = Math.floor(Math.random() * 2_000_000_000);
  const db = createAdminClient();
  const { data, error } = await db
    .from("game_sessions")
    .insert({ student_id: student.id, game_id: card.id, seed, level })
    .select("id")
    .single();
  if (error || !data) throw new Error("Couldn't start the game");
  return { sessionId: data.id, seed, level };
}

export type GameResult = {
  won: boolean;
  score: number;
  reason: string;
  xp: number;
  /** XP the run earned before the daily cap. */
  earned: number;
  capped: boolean;
  xpToday: number;
  nextLevel: number | null;
  levelUp?: number;
};

export async function finishGame(slug: string, sessionId: string, inputs: unknown): Promise<GameResult> {
  const student = await studentOrThrow();
  const db = createAdminClient();
  const [{ card, game }, { data: session }, before] = await Promise.all([
    openGame(slug),
    db.from("game_sessions").select("id, game_id, seed, level, status, started_at").eq("id", sessionId).eq("student_id", student.id).single(),
    gameXpToday(student.id),
  ]);
  if (!session || session.game_id !== card.id) throw new Error("Game session not found");
  if (session.status !== "started") throw new Error("This run is already finished");

  let result;
  try {
    result = replay(game.slug, game.config, session.level, session.seed, inputs);
  } catch {
    throw new Error("That run couldn't be checked. Try again.");
  }

  const earned = gameSessionXp({ won: result.won, score: result.score, level: session.level });
  const xp = capGameXp(earned, before);
  const now = new Date();

  // Only the first finish counts: the status guard makes a replayed request a no-op.
  const { data: updated } = await db
    .from("game_sessions")
    .update({
      status: "finished",
      score: result.score,
      won: result.won,
      xp_awarded: xp,
      skills: result.skills,
      finished_at: now.toISOString(),
      duration_sec: Math.round((now.getTime() - new Date(session.started_at).getTime()) / 1000),
    })
    .eq("id", session.id)
    .eq("status", "started")
    .select("id");
  if (!updated?.length) throw new Error("This run is already finished");

  let levelUp: number | undefined;
  if (xp > 0 && (await awardXp(db, student.id, "game", session.id, xp)) > 0) {
    const totals = await refreshTotals(db, student.id);
    if (totals.levelledUp) levelUp = totals.level;
  }

  const levels = levelsOf(game);
  const bestWon = Math.max(card.bestWonLevel, result.won ? session.level : 0);
  const next = levels.find((l) => l > session.level) ?? null;

  return {
    won: result.won,
    score: result.score,
    reason: result.reason,
    xp,
    earned,
    capped: xp < earned,
    xpToday: before + xp,
    nextLevel: next !== null && openLevels(levels, bestWon).includes(next) ? next : null,
    levelUp,
  };
}
