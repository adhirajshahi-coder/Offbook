import { describe, expect, it } from "vitest";
import { BUDGET_BAZAAR, DECISION_DOJO } from "@/supabase/seed-data/games";
import { budgetConfigSchema, budgetEvents, levelOf, runBudget, type WeekInput } from "./budget-bazaar";
import { dojoConfigSchema, dojoScenario, runDojo } from "./decision-dojo";
import { rng } from "./rng";
import { GAME_DAILY_CAP, capGameXp, gameSessionXp } from "./xp";

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = rng(42);
    const b = rng(42);
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
    expect(rng(1).next()).not.toBe(rng(2).next());
  });
});

describe("Budget Bazaar", () => {
  it("ships a valid config", () => {
    expect(budgetConfigSchema.safeParse(BUDGET_BAZAAR).success).toBe(true);
  });

  const smart = (level: number, seed: number): WeekInput[] =>
    budgetEvents(BUDGET_BAZAAR, level, seed).map((e) => ({ choice: Math.max(0, e.choices.findIndex((c) => c.tag === "smart")), save: 150 }));
  const reckless = (level: number, seed: number): WeekInput[] =>
    budgetEvents(BUDGET_BAZAAR, level, seed).map((e) => ({ choice: Math.max(0, e.choices.findIndex((c) => c.tag === "costly")), save: 0 }));

  it("replays identically from the same seed and inputs (server can verify)", () => {
    const inputs = smart(1, 7);
    expect(runBudget(BUDGET_BAZAAR, 1, 7, inputs)).toEqual(runBudget(BUDGET_BAZAAR, 1, 7, inputs));
  });

  it("rewards smart, steady saving with a win", () => {
    const wins = [1, 2, 3, 4, 5].filter((seed) => runBudget(BUDGET_BAZAAR, 1, seed, smart(1, seed)).won);
    expect(wins.length).toBeGreaterThanOrEqual(4);
  });

  it("doesn't let reckless spending win", () => {
    for (const seed of [1, 2, 3]) expect(runBudget(BUDGET_BAZAAR, 1, seed, reckless(1, seed)).won).toBe(false);
  });

  it("can't save more than you have, and an unfinished run doesn't count", () => {
    const r = runBudget(BUDGET_BAZAAR, 1, 3, [{ choice: 0, save: 999_999 }]);
    expect(r.won).toBe(false);
    expect(r.score).toBe(0);
    expect(r.state.savings).toBeLessThanOrEqual(levelOf(BUDGET_BAZAAR, 1).startCash + 250);
  });

  it("goes broke when needs can't be covered", () => {
    const cfg = { ...BUDGET_BAZAAR, levels: [{ ...BUDGET_BAZAAR.levels[0], startCash: 0, income: 50, needs: 120 }] };
    const r = runBudget(cfg, 1, 1, smart(1, 1));
    expect(r.state.broke).toBe(true);
    expect(r.won).toBe(false);
  });
});

describe("Decision Dojo", () => {
  it("ships a valid config with every path ending", () => {
    const parsed = dojoConfigSchema.safeParse(DECISION_DOJO);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("wins with thoughtful choices and debriefs the reasoning", () => {
    const s = dojoScenario(DECISION_DOJO, 1, 5);
    // Always take the highest-points option.
    const choices: number[] = [];
    let at = s.start;
    while (s.nodes[at]) {
      const opts = s.nodes[at].options;
      const best = opts.reduce((bi, o, i) => (o.points > opts[bi].points ? i : bi), 0);
      choices.push(best);
      at = opts[best].next;
    }
    const r = runDojo(DECISION_DOJO, 1, 5, choices);
    expect(r.won).toBe(true);
    expect(r.ending).not.toBeNull();
    expect(r.path.every((p) => p.debrief.length > 0)).toBe(true);
    expect(r.skills.length).toBeGreaterThan(0);
  });

  it("doesn't count an unfinished story", () => {
    expect(runDojo(DECISION_DOJO, 1, 5, [1]).won).toBe(false);
  });
});

describe("game XP", () => {
  it("caps a session at 50 and a day at 150", () => {
    expect(gameSessionXp({ won: true, score: 10_000, level: 3 })).toBe(50);
    expect(gameSessionXp({ won: false, score: 0, level: 1 })).toBe(10);
    expect(capGameXp(50, 120)).toBe(30);
    expect(capGameXp(50, GAME_DAILY_CAP)).toBe(0);
  });
});
