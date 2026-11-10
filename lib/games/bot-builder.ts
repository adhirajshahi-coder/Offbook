import { z } from "zod";
import { rng } from "./rng";

/**
 * Bot Builder (PRD §7.7): label examples to "train" a tiny classifier, see
 * how it does on new examples (and how wrong labels break it), then pick
 * the prompt that gets a scripted bot to do the job well. v1 is scripted;
 * no live AI. Pure and deterministic: the server replays the labels.
 */

const itemSchema = z.object({ text: z.string().min(1), label: z.number().int().min(0).max(1) });

const promptOptionSchema = z.object({
  prompt: z.string().min(1),
  response: z.string().min(1), // what the scripted bot says back
  points: z.number().int().min(0).max(2),
  why: z.string().min(1),
});

const levelSchema = z.object({
  level: z.number().int().min(1),
  title: z.string().min(1),
  task: z.string().min(1), // e.g. "Teach the bot to spot spam"
  labels: z.tuple([z.string().min(1), z.string().min(1)]),
  items: z.array(itemSchema).min(8),
  trainCount: z.number().int().min(4).max(20),
  testCount: z.number().int().min(3).max(12),
  winAccuracy: z.number().int().min(40).max(100),
  prompts: z.array(z.object({ goal: z.string().min(1), options: z.array(promptOptionSchema).min(2).max(4) })).min(1),
});

export const botConfigSchema = z
  .object({ levels: z.array(levelSchema).min(1) })
  .superRefine((cfg, ctx) => {
    for (const l of cfg.levels) {
      if (l.trainCount + l.testCount > l.items.length) ctx.addIssue({ code: "custom", message: `Level ${l.level}: needs at least ${l.trainCount + l.testCount} items` });
      for (const label of [0, 1]) if (!l.items.some((i) => i.label === label)) ctx.addIssue({ code: "custom", message: `Level ${l.level}: add examples of "${l.labels[label]}"` });
      for (const p of l.prompts) if (!p.options.some((o) => o.points === 2)) ctx.addIssue({ code: "custom", message: `Level ${l.level}: prompt "${p.goal}" needs a best option` });
    }
  });

export type BotConfig = z.infer<typeof botConfigSchema>;
export type BotLevel = BotConfig["levels"][number];

export function botLevel(cfg: BotConfig, level: number): BotLevel {
  return cfg.levels.find((l) => l.level === level) ?? cfg.levels[0];
}

/** Train/test split and prompt order for this run, from the seed. Both labels appear in training. */
export function botRun(cfg: BotConfig, level: number, seed: number) {
  const L = botLevel(cfg, level);
  const r = rng(seed);
  let items = r.shuffle(L.items);
  // Make sure each label shows up in the training set.
  for (const label of [0, 1]) {
    if (!items.slice(0, L.trainCount).some((i) => i.label === label)) {
      const j = items.findIndex((i, k) => k >= L.trainCount && i.label === label);
      if (j >= 0) [items[L.trainCount - 1], items[j]] = [items[j], items[L.trainCount - 1]];
      items = [...items];
    }
  }
  return {
    level: L,
    train: items.slice(0, L.trainCount),
    test: items.slice(L.trainCount, L.trainCount + L.testCount),
    prompts: L.prompts.map((p) => ({ ...p, options: r.shuffle(p.options) })),
  };
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9₹ ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/** Naive Bayes over words: the classic "spam filter" idea, small enough to explain. */
export function train(examples: { text: string; label: number }[]) {
  const counts = [new Map<string, number>(), new Map<string, number>()];
  const totals = [0, 0];
  const docs = [0, 0];
  const vocab = new Set<string>();
  for (const e of examples) {
    docs[e.label]++;
    for (const t of tokens(e.text)) {
      counts[e.label].set(t, (counts[e.label].get(t) ?? 0) + 1);
      totals[e.label]++;
      vocab.add(t);
    }
  }
  return (text: string): number => {
    const scores = [0, 1].map((label) => {
      let s = Math.log((docs[label] + 1) / (docs[0] + docs[1] + 2));
      for (const t of tokens(text)) s += Math.log(((counts[label].get(t) ?? 0) + 1) / (totals[label] + vocab.size + 1));
      return s;
    });
    return scores[1] > scores[0] ? 1 : 0;
  };
}

export type BotInputs = { labels: number[]; prompts: number[] };

export type BotResult = {
  won: boolean;
  score: number;
  accuracy: number;
  labelAccuracy: number;
  promptPoints: number;
  promptMax: number;
  reason: string;
  skills: string[];
  predictions: { text: string; predicted: number; actual: number }[];
};

export function runBot(cfg: BotConfig, level: number, seed: number, inputs: BotInputs): BotResult {
  const run = botRun(cfg, level, seed);
  const L = run.level;
  const promptMax = run.prompts.length * 2;
  if (inputs.labels.length < run.train.length || inputs.prompts.length < run.prompts.length) {
    return { won: false, score: 0, accuracy: 0, labelAccuracy: 0, promptPoints: 0, promptMax, reason: "The bot wasn't finished.", skills: [], predictions: [] };
  }
  const labelled = run.train.map((item, i) => ({ text: item.text, label: inputs.labels[i] === 1 ? 1 : 0 }));
  const labelAccuracy = Math.round((labelled.filter((x, i) => x.label === run.train[i].label).length / run.train.length) * 100);
  const classify = train(labelled);
  const predictions = run.test.map((t) => ({ text: t.text, predicted: classify(t.text), actual: t.label }));
  const accuracy = Math.round((predictions.filter((p) => p.predicted === p.actual).length / predictions.length) * 100);
  const promptPoints = run.prompts.reduce((n, p, i) => n + p.options[Math.max(0, Math.min(p.options.length - 1, inputs.prompts[i]))].points, 0);
  const won = accuracy >= L.winAccuracy && promptPoints * 2 >= promptMax;
  return {
    won,
    score: accuracy * 3 + promptPoints * 40 + (won ? 100 : 0),
    accuracy,
    labelAccuracy,
    promptPoints,
    promptMax,
    reason: won
      ? `Your bot got ${accuracy}% right on examples it had never seen. Good data and clear prompts make good AI.`
      : labelAccuracy < 80
        ? `Some training labels were off (${labelAccuracy}% correct), so the bot learned the wrong lessons. Bad data in, bad answers out.`
        : `Your bot got ${accuracy}% right. Check the prompt tips and try again.`,
    skills: ["training-data", "ai-limits", "prompting"],
    predictions,
  };
}
