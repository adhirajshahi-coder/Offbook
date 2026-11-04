import { z } from "zod";
import { rng } from "./rng";

/**
 * Decision Dojo (PRD §7.7): branching story scenarios with consequences and
 * a debrief on the reasoning used. Pure and deterministic like Budget
 * Bazaar: the server replays the choices to score a run.
 */

const optionSchema = z.object({
  label: z.string().min(1),
  next: z.string().min(1), // node id, or an ending id
  points: z.number().int().min(-2).max(3),
  skill: z.string().min(1), // reasoning used, a skill slug
  debrief: z.string().min(1),
});

const nodeSchema = z.object({ text: z.string().min(1), options: z.array(optionSchema).min(2).max(4) });

const endingSchema = z.object({ title: z.string().min(1), text: z.string().min(1) });

const scenarioSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().min(1),
  title: z.string().min(1),
  intro: z.string().min(1),
  start: z.string().min(1),
  nodes: z.record(z.string(), nodeSchema),
  endings: z.record(z.string(), endingSchema),
  /** Points needed to count as a win. */
  winAt: z.number().int(),
});

export const dojoConfigSchema = z
  .object({ scenarios: z.array(scenarioSchema).min(1) })
  .superRefine((cfg, ctx) => {
    for (const s of cfg.scenarios) {
      if (!s.nodes[s.start]) ctx.addIssue({ code: "custom", message: `${s.id}: start node "${s.start}" is missing` });
      for (const [id, node] of Object.entries(s.nodes)) {
        for (const o of node.options) {
          if (!s.nodes[o.next] && !s.endings[o.next]) ctx.addIssue({ code: "custom", message: `${s.id}/${id}: "${o.label}" goes to unknown "${o.next}"` });
        }
      }
    }
  });

export type DojoConfig = z.infer<typeof dojoConfigSchema>;
export type DojoScenario = DojoConfig["scenarios"][number];

/** Which scenario a run uses: picked from the level's scenarios by the seed. */
export function dojoScenario(config: DojoConfig, level: number, seed: number): DojoScenario {
  const pool = config.scenarios.filter((s) => s.level === level);
  return rng(seed).pick(pool.length ? pool : config.scenarios);
}

export type DojoStep = { node: string; text: string; choice: string; points: number; skill: string; debrief: string };

export type DojoResult = {
  won: boolean;
  score: number;
  points: number;
  ending: { title: string; text: string } | null;
  path: DojoStep[];
  skills: string[];
  reason: string;
};

/** Replay choices (option indexes) through the story. */
export function runDojo(config: DojoConfig, level: number, seed: number, choices: number[]): DojoResult {
  const s = dojoScenario(config, level, seed);
  let at = s.start;
  const path: DojoStep[] = [];
  for (let i = 0; i < 20; i++) {
    const node = s.nodes[at];
    if (!node) break;
    const idx = choices[i];
    if (idx === undefined) {
      return { won: false, score: 0, points: 0, ending: null, path, skills: [], reason: "The story wasn't finished." };
    }
    const option = node.options[Math.max(0, Math.min(node.options.length - 1, idx))];
    path.push({ node: at, text: node.text, choice: option.label, points: option.points, skill: option.skill, debrief: option.debrief });
    at = option.next;
  }
  const ending = s.endings[at] ?? null;
  const points = path.reduce((n, p) => n + p.points, 0);
  const won = Boolean(ending) && points >= s.winAt;
  return {
    won,
    score: Math.max(0, points * 40 + (won ? 100 : 0)),
    points,
    ending,
    path,
    skills: [...new Set(path.map((p) => p.skill))],
    reason: won ? "Thoughtful choices. You weighed the facts and the people involved." : "Every choice taught something. Read the debrief and try another path.",
  };
}
