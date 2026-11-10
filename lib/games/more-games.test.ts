import { describe, expect, it } from "vitest";
import { BOT_BUILDER, SAY_IT_BETTER, STARTUP_SPRINT } from "@/supabase/seed-data/games-more";
import { BUDGET_BAZAAR, DECISION_DOJO } from "@/supabase/seed-data/games";
import { botConfigSchema, botRun, runBot, train } from "./bot-builder";
import { configIssues, replay } from "./registry";
import { runSay, sayConfigSchema, sayRun } from "./say-it-better";
import { priceDemand, runSprint, sprintConfigSchema, sprintRun } from "./startup-sprint";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe("registry", () => {
  it("validates every shipped config", () => {
    expect(configIssues("budget-bazaar", BUDGET_BAZAAR)).toEqual([]);
    expect(configIssues("decision-dojo", DECISION_DOJO)).toEqual([]);
    expect(configIssues("say-it-better", SAY_IT_BETTER)).toEqual([]);
    expect(configIssues("bot-builder", BOT_BUILDER)).toEqual([]);
    expect(configIssues("startup-sprint", STARTUP_SPRINT)).toEqual([]);
    expect(configIssues("unknown", {})).toBeNull();
  });

  it("rejects malformed player input", () => {
    expect(() => replay("bot-builder", BOT_BUILDER, 1, 1, { labels: "nope" })).toThrow();
  });
});

describe("Say It Better", () => {
  it("wins with the best lines, loses with the weakest, deterministically", () => {
    expect(sayConfigSchema.safeParse(SAY_IT_BETTER).success).toBe(true);
    for (const level of [1, 2, 3]) {
      for (const seed of SEEDS) {
        const { rounds } = sayRun(SAY_IT_BETTER, level, seed);
        const best = rounds.map((r) => r.options.findIndex((o) => o.points === 2));
        const worst = rounds.map((r) => r.options.findIndex((o) => o.points === 0));
        expect(runSay(SAY_IT_BETTER, level, seed, { choices: best, spoke: false, rubric: [] }).won).toBe(true);
        expect(runSay(SAY_IT_BETTER, level, seed, { choices: worst, spoke: false, rubric: [] }).won).toBe(false);
      }
    }
    const inputs = { choices: [0, 1, 2, 0, 1, 2], spoke: true, rubric: [true, true, false, true] };
    expect(runSay(SAY_IT_BETTER, 2, 9, inputs)).toEqual(runSay(SAY_IT_BETTER, 2, 9, inputs));
  });

  it("can't be gamed by always picking the longest line", () => {
    const longestIsBest = SAY_IT_BETTER.rounds.filter((r) => {
      const max = Math.max(...r.options.map((o) => o.text.length));
      return r.options.find((o) => o.points === 2)!.text.length === max;
    });
    expect(longestIsBest.length / SAY_IT_BETTER.rounds.length).toBeLessThanOrEqual(0.5);
    for (const level of [1, 2, 3]) {
      let wins = 0;
      for (const seed of SEEDS) {
        const { rounds } = sayRun(SAY_IT_BETTER, level, seed);
        const longest = rounds.map((r) => r.options.reduce((bi, o, i, a) => (o.text.length > a[bi].text.length ? i : bi), 0));
        if (runSay(SAY_IT_BETTER, level, seed, { choices: longest, spoke: false, rubric: [] }).won) wins++;
      }
      expect(wins).toBeLessThanOrEqual(2);
    }
  });

  it("self-rated speaking adds score but never decides a win", () => {
    const { rounds } = sayRun(SAY_IT_BETTER, 1, 3);
    const worst = rounds.map((r) => r.options.findIndex((o) => o.points === 0));
    const r = runSay(SAY_IT_BETTER, 1, 3, { choices: worst, spoke: true, rubric: [true, true, true, true] });
    expect(r.won).toBe(false);
    expect(r.score).toBe(40);
  });
});

describe("Bot Builder", () => {
  it("learns words from labelled examples", () => {
    const classify = train([
      { text: "free prize click now", label: 1 },
      { text: "homework for tomorrow", label: 0 },
    ]);
    expect(classify("click for a free prize")).toBe(1);
    expect(classify("tomorrow's homework")).toBe(0);
  });

  it("wins with correct labels and good prompts; wrong labels break the bot", () => {
    expect(botConfigSchema.safeParse(BOT_BUILDER).success).toBe(true);
    for (const level of [1, 2, 3]) {
      let goodWins = 0;
      for (const seed of SEEDS) {
        const run = botRun(BOT_BUILDER, level, seed);
        const best = run.prompts.map((p) => p.options.findIndex((o) => o.points === 2));
        const good = runBot(BOT_BUILDER, level, seed, { labels: run.train.map((t) => t.label), prompts: best });
        if (good.won) goodWins++;
        const flipped = runBot(BOT_BUILDER, level, seed, { labels: run.train.map((t) => 1 - t.label), prompts: best });
        expect(flipped.won).toBe(false);
        expect(flipped.accuracy).toBeLessThanOrEqual(good.accuracy);
      }
      expect(goodWins).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("Startup Sprint", () => {
  it("prices sensibly", () => {
    expect(priceDemand(40, 40)).toBe(1);
    expect(priceDemand(80, 40)).toBe(0);
    expect(priceDemand(20, 40)).toBeGreaterThan(1);
  });

  it("rewards good interviews, a fair price and the right channel", () => {
    expect(sprintConfigSchema.safeParse(STARTUP_SPRINT).success).toBe(true);
    for (const level of [1, 2, 3]) {
      let wins = 0;
      for (const seed of SEEDS) {
        const run = sprintRun(STARTUP_SPRINT, level, seed);
        const p = run.problems[0];
        const good = p.questions.map((q, i) => (q.good ? i : -1)).filter((i) => i >= 0).slice(0, run.level.interviewPicks);
        const bad = p.questions.map((q, i) => (!q.good ? i : -1)).filter((i) => i >= 0).slice(0, run.level.interviewPicks);
        const smart = runSprint(STARTUP_SPRINT, level, seed, { problem: 0, questions: good, price: p.idealPrice, channels: Array(run.level.weeks).fill(p.bestChannel) });
        const poor = runSprint(STARTUP_SPRINT, level, seed, { problem: 0, questions: bad, price: p.idealPrice * 2, channels: Array(run.level.weeks).fill("flyers") });
        if (smart.won) wins++;
        expect(poor.won).toBe(false);
        expect(smart.profit).toBeGreaterThan(poor.profit);
      }
      expect(wins).toBeGreaterThanOrEqual(6);
    }
  });
});
