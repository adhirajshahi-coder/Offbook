import { z } from "zod";
import { rng } from "./rng";

/**
 * Startup Sprint (PRD §7.7): pick a problem, interview customers (good
 * questions find real needs), set a price, choose marketing each week and
 * watch sales. Decisions change results; the seed adds a little market luck.
 * Pure and deterministic: the server replays the decisions.
 */

const questionSchema = z.object({ q: z.string().min(1), good: z.boolean(), insight: z.string().min(1) });

const problemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  customer: z.string().min(1),
  product: z.string().min(1),
  unitCost: z.number().int().min(0),
  idealPrice: z.number().int().min(1),
  marketSize: z.number().int().min(10), // potential buyers a week at full fit and reach
  questions: z.array(questionSchema).min(4),
  bestChannel: z.string().min(1),
});

const channelSchema = z.object({ id: z.string().min(1), label: z.string().min(1), cost: z.number().int().min(0), reach: z.number().min(0).max(1), note: z.string() });

const levelSchema = z.object({
  level: z.number().int().min(1),
  title: z.string().min(1),
  weeks: z.number().int().min(2).max(8),
  startCash: z.number().int().min(0),
  goalProfit: z.number().int(),
  interviewPicks: z.number().int().min(2).max(5),
});

export const sprintConfigSchema = z
  .object({ levels: z.array(levelSchema).min(1), problems: z.array(problemSchema).min(3), channels: z.array(channelSchema).min(2) })
  .superRefine((cfg, ctx) => {
    const ids = new Set(cfg.channels.map((c) => c.id));
    for (const p of cfg.problems) {
      if (!ids.has(p.bestChannel)) ctx.addIssue({ code: "custom", message: `${p.id}: bestChannel "${p.bestChannel}" isn't a channel` });
      if (p.questions.filter((q) => q.good).length < 2) ctx.addIssue({ code: "custom", message: `${p.id}: needs at least two good interview questions` });
    }
    for (const l of cfg.levels) {
      for (const p of cfg.problems) {
        if (p.questions.filter((q) => q.good).length < l.interviewPicks) ctx.addIssue({ code: "custom", message: `${p.id}: fewer good questions than level ${l.level} asks for` });
      }
    }
  });

export type SprintConfig = z.infer<typeof sprintConfigSchema>;
export type SprintProblem = SprintConfig["problems"][number];

export function sprintLevel(cfg: SprintConfig, level: number) {
  return cfg.levels.find((l) => l.level === level) ?? cfg.levels[0];
}

/** Three problems to choose from (questions shuffled), from the seed. */
export function sprintRun(cfg: SprintConfig, level: number, seed: number) {
  const r = rng(seed);
  const problems = r
    .shuffle(cfg.problems)
    .slice(0, 3)
    .map((p) => ({ ...p, questions: r.shuffle(p.questions) }));
  return { level: sprintLevel(cfg, level), problems };
}

/** Demand falls off as price moves away from what customers value: full at the ideal, half at ±50%. */
export function priceDemand(price: number, ideal: number): number {
  const ratio = price / ideal;
  if (ratio <= 0) return 0;
  return ratio <= 1 ? Math.min(1.25, 1 + (1 - ratio) * 0.5) : Math.max(0, 1 - (ratio - 1));
}

export type SprintInputs = { problem: number; questions: number[]; price: number; channels: string[] };

export type SprintWeek = { week: number; channel: string; sales: number; revenue: number; costs: number; cash: number };

export type SprintResult = {
  won: boolean;
  score: number;
  profit: number;
  fit: number;
  reason: string;
  skills: string[];
  weeks: SprintWeek[];
  insights: string[];
};

export function runSprint(cfg: SprintConfig, level: number, seed: number, inputs: SprintInputs): SprintResult {
  const run = sprintRun(cfg, level, seed);
  const L = run.level;
  const fail = (reason: string): SprintResult => ({ won: false, score: 0, profit: 0, fit: 0, reason, skills: [], weeks: [], insights: [] });
  const p = run.problems[inputs.problem];
  if (!p) return fail("Pick a problem first.");
  const picks = [...new Set(inputs.questions)].filter((i) => i >= 0 && i < p.questions.length).slice(0, L.interviewPicks);
  if (picks.length < L.interviewPicks || inputs.channels.length < L.weeks) return fail("The sprint wasn't finished.");
  if (!(inputs.price > 0 && inputs.price <= p.idealPrice * 5)) return fail("Set a price customers could pay.");

  // Product fit: good questions uncover what customers really need.
  const good = picks.filter((i) => p.questions[i].good).length;
  const fit = 0.35 + 0.65 * (good / L.interviewPicks);
  const demand = priceDemand(inputs.price, p.idealPrice);
  const luck = rng(seed * 7 + 13);
  let cash = L.startCash;
  const weeks: SprintWeek[] = [];
  let buzz = 0; // happy customers tell friends
  for (let w = 0; w < L.weeks; w++) {
    const ch = cfg.channels.find((c) => c.id === inputs.channels[w]) ?? cfg.channels[0];
    const match = ch.id === p.bestChannel ? 1.3 : 1;
    const noise = 0.85 + luck.next() * 0.3;
    const sales = Math.max(0, Math.round(p.marketSize * ch.reach * match * fit * demand * noise + buzz));
    const revenue = sales * inputs.price;
    const costs = sales * p.unitCost + ch.cost;
    cash += revenue - costs;
    buzz = Math.round(sales * 0.15 * fit);
    weeks.push({ week: w + 1, channel: ch.label, sales, revenue, costs, cash });
  }
  const profit = cash - L.startCash;
  const won = profit >= L.goalProfit;
  const priceNote =
    inputs.price > p.idealPrice * 1.3 ? "Your price scared buyers off." : inputs.price < p.idealPrice * 0.6 ? "Your price was so low you barely made money on each sale." : "Your price felt fair to customers.";
  return {
    won,
    score: Math.max(0, Math.round(profit / 10) + Math.round(fit * 100) + (won ? 100 : 0)),
    profit,
    fit: Math.round(fit * 100),
    reason: won ? `₹${profit} profit. You listened to customers, priced fairly and found them where they are.` : `₹${profit} profit, short of the ₹${L.goalProfit} goal. ${priceNote}`,
    skills: ["customer-discovery", "pricing", "marketing", "unit-economics"],
    weeks,
    insights: picks.map((i) => p.questions[i].insight),
  };
}
