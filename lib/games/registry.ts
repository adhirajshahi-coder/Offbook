import { z } from "zod";
import { botConfigSchema, runBot } from "./bot-builder";
import { budgetConfigSchema, runBudget } from "./budget-bazaar";
import { dojoConfigSchema, runDojo } from "./decision-dojo";
import { runSay, sayConfigSchema } from "./say-it-better";
import { runSprint, sprintConfigSchema } from "./startup-sprint";

/**
 * Every playable game in one place (PRD §7.7): its config schema, its
 * player-input schema, how to replay a run, and its levels. Server actions,
 * the HQ editor and the seed all go through this.
 */

export type RunResult = { won: boolean; score: number; reason: string; skills: string[] };

type Entry<C> = {
  schema: z.ZodType<C>;
  inputs: z.ZodType<unknown>;
  run: (config: C, level: number, seed: number, inputs: never) => RunResult;
  levels: (config: C) => { level: number; title: string }[];
};

const LEVEL_NAMES = ["Warm-up", "Trickier", "Expert", "Master"];
const named = (levels: number[]) => [...new Set(levels)].sort((a, b) => a - b).map((l) => ({ level: l, title: LEVEL_NAMES[l - 1] ?? `Level ${l}` }));

export const GAMES = {
  "budget-bazaar": {
    schema: budgetConfigSchema,
    inputs: z.array(z.object({ choice: z.number().int().min(0).max(10), save: z.number().int().min(0).max(1_000_000), risky: z.boolean().optional() })).max(10),
    run: runBudget,
    levels: (c) => c.levels.map((l) => ({ level: l.level, title: l.title })),
  } satisfies Entry<z.infer<typeof budgetConfigSchema>>,
  "decision-dojo": {
    schema: dojoConfigSchema,
    inputs: z.array(z.number().int().min(0).max(10)).max(20),
    run: runDojo,
    levels: (c) => named(c.scenarios.map((s) => s.level)),
  } satisfies Entry<z.infer<typeof dojoConfigSchema>>,
  "say-it-better": {
    schema: sayConfigSchema,
    inputs: z.object({ choices: z.array(z.number().int().min(0).max(10)).max(20), spoke: z.boolean(), rubric: z.array(z.boolean()).max(6) }),
    run: runSay,
    levels: (c) => named(c.rounds.map((r) => r.level)),
  } satisfies Entry<z.infer<typeof sayConfigSchema>>,
  "bot-builder": {
    schema: botConfigSchema,
    inputs: z.object({ labels: z.array(z.number().int().min(0).max(1)).max(30), prompts: z.array(z.number().int().min(0).max(10)).max(10) }),
    run: runBot,
    levels: (c) => c.levels.map((l) => ({ level: l.level, title: l.title })),
  } satisfies Entry<z.infer<typeof botConfigSchema>>,
  "startup-sprint": {
    schema: sprintConfigSchema,
    inputs: z.object({
      problem: z.number().int().min(0).max(5),
      questions: z.array(z.number().int().min(0).max(20)).max(6),
      price: z.number().int().min(1).max(100_000),
      channels: z.array(z.string().max(40)).max(10),
    }),
    run: runSprint,
    levels: (c) => c.levels.map((l) => ({ level: l.level, title: l.title })),
  } satisfies Entry<z.infer<typeof sprintConfigSchema>>,
};

export type GameSlug = keyof typeof GAMES;
export const PLAYABLE = Object.keys(GAMES) as GameSlug[];

export function isGameSlug(slug: string): slug is GameSlug {
  return slug in GAMES;
}

/** Validate a stored config; null if the slug has no engine or the config is invalid. */
export function parseConfig(slug: string, raw: unknown): unknown | null {
  if (!isGameSlug(slug)) return null;
  const r = GAMES[slug].schema.safeParse(raw);
  return r.success ? r.data : null;
}

export function configIssues(slug: string, raw: unknown): string[] | null {
  if (!isGameSlug(slug)) return null;
  const r = GAMES[slug].schema.safeParse(raw);
  return r.success ? [] : r.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "config"}: ${i.message}`);
}

export function gameLevels(slug: GameSlug, config: unknown): { level: number; title: string }[] {
  return (GAMES[slug].levels as (c: unknown) => { level: number; title: string }[])(config);
}

/** Replay a run on the server: inputs are validated first. */
export function replay(slug: GameSlug, config: unknown, level: number, seed: number, inputs: unknown): RunResult {
  const parsed = GAMES[slug].inputs.parse(inputs);
  return (GAMES[slug].run as (c: unknown, l: number, s: number, i: unknown) => RunResult)(config, level, seed, parsed);
}
