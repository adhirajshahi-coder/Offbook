import { z } from "zod";
import { rng } from "./rng";

/**
 * Budget Bazaar (PRD §7.7): run a month of pocket money week by week.
 * Income arrives, needs get paid, something happens, you choose, then you
 * decide how much to save. Win by hitting the savings goal without going
 * broke and while still enjoying life a bit (no pure hoarding).
 *
 * Pure and deterministic: the same config, level, seed and inputs always
 * give the same result, so the server can replay and verify any run.
 */

const choiceSchema = z.object({
  label: z.string().min(1),
  cash: z.number().int(), // change to cash in ₹ (negative = spend)
  joy: z.number().int().min(-30).max(30), // change to happiness
  tag: z.enum(["smart", "ok", "costly"]),
  why: z.string().min(1),
});

const eventSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  choices: z.array(choiceSchema).min(1).max(4),
});

const levelSchema = z.object({
  level: z.number().int().min(1),
  title: z.string(),
  weeks: z.number().int().min(2).max(8),
  startCash: z.number().int().min(0),
  income: z.number().int().min(0),
  needs: z.number().int().min(0),
  goal: z.number().int().min(1),
  minJoy: z.number().int().min(0).max(100),
  /** Weekly interest on savings in %, from level 2 (0 = none). */
  interestPct: z.number().min(0).max(10),
  /** Level 3: offer a risky investment each week. */
  riskyOption: z.boolean(),
});

export const budgetConfigSchema = z.object({
  levels: z.array(levelSchema).min(1),
  events: z.array(eventSchema).min(4),
});

export type BudgetConfig = z.infer<typeof budgetConfigSchema>;
export type BudgetLevel = z.infer<typeof levelSchema>;
export type BudgetEvent = z.infer<typeof eventSchema>;

export type WeekInput = {
  /** Index of the chosen option for this week's event. */
  choice: number;
  /** Rupees moved into savings after the event. */
  save: number;
  /** Level 3: put savings in the risky option this week. */
  risky?: boolean;
};

export type BudgetState = {
  week: number; // 0-based, weeks completed
  cash: number;
  savings: number;
  joy: number;
  broke: boolean;
  smartCalls: number;
  /** Times you had to dip into savings to cover a shortfall. */
  dips: number;
  log: { week: number; event: string; choice: string; tag: string; why: string; saved: number; growth: number; dipped: number }[];
};

export function levelOf(config: BudgetConfig, level: number): BudgetLevel {
  return config.levels.find((l) => l.level === level) ?? config.levels[0];
}

/** The events this run will show, one per week, from the seed. */
export function budgetEvents(config: BudgetConfig, level: number, seed: number): BudgetEvent[] {
  const L = levelOf(config, level);
  const r = rng(seed);
  const order = r.shuffle(config.events);
  return Array.from({ length: L.weeks }, (_, i) => order[i % order.length]);
}

export function startBudget(config: BudgetConfig, level: number): BudgetState {
  const L = levelOf(config, level);
  return { week: 0, cash: L.startCash, savings: 0, joy: 60, broke: false, smartCalls: 0, dips: 0, log: [] };
}

/** Cash available for the event, after income and needs this week. */
export function cashBeforeEvent(state: BudgetState, L: BudgetLevel): number {
  return state.cash + L.income - L.needs;
}

/** Risky option outcome for a week: −5% to +8%, decided by the seed. */
function riskyReturn(seed: number, week: number): number {
  const r = rng(seed * 31 + week + 7);
  return [-5, -3, 2, 5, 8][Math.floor(r.next() * 5)];
}

export function budgetWeek(config: BudgetConfig, level: number, seed: number, state: BudgetState, input: WeekInput): BudgetState {
  if (state.broke) return state;
  const L = levelOf(config, level);
  const event = budgetEvents(config, level, seed)[state.week];
  const choice = event.choices[Math.max(0, Math.min(event.choices.length - 1, input.choice))];

  let cash = cashBeforeEvent(state, L) + choice.cash;
  let joy = state.joy + choice.joy - 2; // a little joy fades each week
  let savings = state.savings;

  // Short of cash: dip into savings (it stings a bit). Broke only if savings can't cover it.
  let dipped = 0;
  if (cash < 0 && savings > 0) {
    dipped = Math.min(savings, -cash);
    savings -= dipped;
    cash += dipped;
    joy -= 5;
  }
  joy = Math.max(0, Math.min(100, joy));
  const broke = cash < 0;
  const save = broke ? 0 : Math.max(0, Math.min(Math.floor(cash / 10) * 10, Math.round(input.save / 10) * 10));
  cash -= save;

  const rate = L.riskyOption && input.risky ? riskyReturn(seed, state.week) : L.interestPct;
  const growth = Math.round((savings * rate) / 100);
  savings += save + growth;

  return {
    week: state.week + 1,
    cash,
    savings,
    joy,
    broke,
    smartCalls: state.smartCalls + (choice.tag === "smart" ? 1 : 0),
    dips: state.dips + (dipped > 0 ? 1 : 0),
    log: [...state.log, { week: state.week + 1, event: event.text, choice: choice.label, tag: choice.tag, why: choice.why, saved: save, growth, dipped }],
  };
}

export type BudgetResult = {
  won: boolean;
  score: number;
  state: BudgetState;
  reason: string;
  skills: string[];
};

export function finishBudget(config: BudgetConfig, level: number, state: BudgetState): BudgetResult {
  const L = levelOf(config, level);
  const reachedGoal = state.savings >= L.goal;
  const enjoyed = state.joy >= L.minJoy;
  const won = !state.broke && reachedGoal && enjoyed;
  const reason = state.broke
    ? "You ran out of money. Needs come first, then plan the rest."
    : !reachedGoal
      ? `You saved ₹${state.savings} of your ₹${L.goal} goal. Try saving a bit every week.`
      : !enjoyed
        ? "You hit the goal but had no fun at all. A good budget leaves room for small joys."
        : `Goal reached: ₹${state.savings} saved, and you still enjoyed the month.`;
  const score = state.broke ? 0 : Math.max(0, state.savings + state.joy * 2 + state.smartCalls * 25 - state.dips * 30 + (won ? 200 : 0));
  const skills = ["needs-vs-wants", "budgeting", "saving-goals", ...(L.interestPct > 0 || L.riskyOption ? ["compound-interest"] : []), ...(L.riskyOption ? ["risk-return"] : [])];
  return { won, score, state, reason, skills };
}

/** Replay a whole run from inputs: what the server uses to verify. */
export function runBudget(config: BudgetConfig, level: number, seed: number, inputs: WeekInput[]): BudgetResult {
  const L = levelOf(config, level);
  let s = startBudget(config, level);
  for (const input of inputs.slice(0, L.weeks)) {
    s = budgetWeek(config, level, seed, s, input);
    if (s.broke) break;
  }
  if (!s.broke && s.week < L.weeks) {
    return { won: false, score: 0, state: s, reason: "The run wasn't finished.", skills: [] };
  }
  return finishBudget(config, level, s);
}
