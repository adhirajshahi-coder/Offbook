import { z } from "zod";
import { rng } from "./rng";

/**
 * Say It Better (PRD §7.7): rapid rounds where you pick the clearer, kinder
 * or more persuasive line, then an optional 30-second spoken challenge
 * scored by a self-rubric. Recordings stay in the browser and are never
 * uploaded (D-068). Pure and deterministic: the server replays choices.
 */

const optionSchema = z.object({
  text: z.string().min(1),
  points: z.number().int().min(0).max(2), // 2 best, 1 okay, 0 weak
  why: z.string().min(1),
});

const roundSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().min(1),
  goal: z.enum(["clearer", "kinder", "persuasive"]),
  situation: z.string().min(1),
  options: z.array(optionSchema).min(2).max(4),
});

const speakSchema = z.object({ level: z.number().int().min(1), prompt: z.string().min(1) });

export const sayConfigSchema = z
  .object({
    roundsPerRun: z.number().int().min(3).max(12),
    winPct: z.number().int().min(30).max(100),
    rounds: z.array(roundSchema).min(3),
    speak: z.array(speakSchema).min(1),
    rubric: z.array(z.string().min(1)).min(2).max(6),
  })
  .superRefine((cfg, ctx) => {
    for (const r of cfg.rounds) {
      if (!r.options.some((o) => o.points === 2)) ctx.addIssue({ code: "custom", message: `${r.id}: needs one best option (points 2)` });
    }
  });

export type SayConfig = z.infer<typeof sayConfigSchema>;
export type SayRound = SayConfig["rounds"][number];

export const GOAL_LABEL = { clearer: "Make it clearer", kinder: "Make it kinder", persuasive: "Make it more persuasive" } as const;

export function sayLevels(cfg: SayConfig): number[] {
  return [...new Set(cfg.rounds.map((r) => r.level))].sort((a, b) => a - b);
}

/** This run's rounds (options shuffled) and speaking prompt, from the seed. */
export function sayRun(cfg: SayConfig, level: number, seed: number): { rounds: SayRound[]; speak: string } {
  const r = rng(seed);
  const pool = cfg.rounds.filter((x) => x.level === level);
  const rounds = r
    .shuffle(pool.length ? pool : cfg.rounds)
    .slice(0, cfg.roundsPerRun)
    .map((round) => ({ ...round, options: r.shuffle(round.options) }));
  const speakPool = cfg.speak.filter((s) => s.level <= level);
  return { rounds, speak: r.pick(speakPool.length ? speakPool : cfg.speak).prompt };
}

export type SayInputs = { choices: number[]; spoke: boolean; rubric: boolean[] };

export type SayResult = {
  won: boolean;
  score: number;
  points: number;
  max: number;
  reason: string;
  skills: string[];
  review: { situation: string; goal: string; chosen: string; best: string; why: string; points: number }[];
};

export function runSay(cfg: SayConfig, level: number, seed: number, inputs: SayInputs): SayResult {
  const { rounds } = sayRun(cfg, level, seed);
  if (inputs.choices.length < rounds.length) {
    return { won: false, score: 0, points: 0, max: rounds.length * 2, reason: "The rounds weren't finished.", skills: [], review: [] };
  }
  const review = rounds.map((round, i) => {
    const chosen = round.options[Math.max(0, Math.min(round.options.length - 1, inputs.choices[i]))];
    const best = round.options.find((o) => o.points === 2)!;
    return { situation: round.situation, goal: GOAL_LABEL[round.goal], chosen: chosen.text, best: best.text, why: chosen.why, points: chosen.points };
  });
  const points = review.reduce((n, r) => n + r.points, 0);
  const max = rounds.length * 2;
  const won = points * 100 >= max * cfg.winPct;
  // Speaking is self-rated, so it adds a little score and never decides a win.
  const selfPoints = inputs.spoke ? inputs.rubric.slice(0, cfg.rubric.length).filter(Boolean).length : 0;
  const goals = new Set(rounds.map((r) => r.goal));
  return {
    won,
    score: points * 30 + selfPoints * 10 + (won ? 100 : 0),
    points,
    max,
    reason: won ? "Clear, kind and convincing. That's how good communicators sound." : `You scored ${points} of ${max}. Read why each best line works, then try again.`,
    skills: [...(goals.has("clearer") ? ["clear-writing"] : []), ...(goals.has("kinder") ? ["empathy"] : []), ...(goals.has("persuasive") ? ["persuasion"] : []), ...(inputs.spoke ? ["public-speaking"] : [])],
    review,
  };
}
