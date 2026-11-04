"use client";

import { useMemo, useState } from "react";
import { GameShell, type RunProps, type ShellLevel } from "@/components/kid/GameShell";
import { Button } from "@/components/ui/button";
import { budgetEvents, budgetWeek, cashBeforeEvent, finishBudget, levelOf, runBudget, startBudget, type BudgetConfig, type WeekInput } from "@/lib/games/budget-bazaar";
import { cn } from "@/lib/utils";

const TAG_LABEL = { smart: "Smart call", ok: "Okay", costly: "Costly" } as const;
const TAG_CLASS = { smart: "border-mint", ok: "border-sky", costly: "border-coral" } as const;

export function BudgetBazaar({
  config,
  levels,
  xpToday,
  title,
  intro,
  preview = false,
}: {
  config: BudgetConfig;
  levels: ShellLevel[];
  xpToday: number;
  title: string;
  intro: string;
  preview?: boolean;
}) {
  const local = preview ? (seed: number, level: number, inputs: unknown) => runBudget(config, level, seed, inputs as WeekInput[]) : undefined;
  return (
    <GameShell slug="budget-bazaar" title={title} intro={intro} levels={levels} xpToday={xpToday} local={local} backHref={preview ? "/hq/content/games/budget-bazaar" : undefined}>
      {(run) => <BudgetRun key={`${run.seed}-${run.level}`} config={config} {...run} />}
    </GameShell>
  );
}

function BudgetRun({ config, seed, level, finish, busy }: RunProps & { config: BudgetConfig }) {
  const L = levelOf(config, level);
  const events = useMemo(() => budgetEvents(config, level, seed), [config, level, seed]);
  const [state, setState] = useState(() => startBudget(config, level));
  const [inputs, setInputs] = useState<WeekInput[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [save, setSave] = useState(0);
  const [risky, setRisky] = useState(false);

  const done = state.broke || state.week >= L.weeks;
  const event = events[state.week];
  const available = done ? 0 : cashBeforeEvent(state, L) + (choice !== null ? event.choices[choice].cash : 0);
  const canSaveUpTo = Math.max(0, Math.floor(available / 10) * 10);
  const goalPct = Math.min(100, Math.round((state.savings / L.goal) * 100));

  function nextWeek() {
    if (choice === null) return;
    const input: WeekInput = { choice, save: Math.min(save, canSaveUpTo), risky: L.riskyOption ? risky : undefined };
    setState((s) => budgetWeek(config, level, seed, s, input));
    setInputs((xs) => [...xs, input]);
    setChoice(null);
    setSave(0);
  }

  if (done) {
    const summary = finishBudget(config, level, state);
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-black">{state.broke ? "Out of money" : "Month over"}</h2>
        <Stats savings={state.savings} goal={L.goal} joy={state.joy} minJoy={L.minJoy} cash={state.cash} goalPct={goalPct} />
        <ol className="space-y-2">
          {state.log.map((l) => (
            <li key={l.week} className={cn("rounded-band border-2 bg-surface p-3 text-sm", TAG_CLASS[l.tag as keyof typeof TAG_CLASS])}>
              <p className="font-semibold">
                Week {l.week}: {l.choice}
              </p>
              <p className="text-muted">{l.why}</p>
              <p className="mt-1 text-xs text-muted">
                Saved ₹{l.saved}
                {l.growth !== 0 && ` · savings ${l.growth > 0 ? "grew" : "shrank"} ₹${Math.abs(l.growth)}`}
                {l.dipped > 0 && ` · had to use ₹${l.dipped} of savings`}
              </p>
            </li>
          ))}
        </ol>
        <p className="font-semibold">{summary.reason}</p>
        <Button onClick={() => finish(inputs)} disabled={busy}>
          {busy ? "Checking…" : "See my result"}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-black">
          Week {state.week + 1} of {L.weeks}
        </h2>
        <p className="text-sm text-muted">{L.title}</p>
      </div>
      <Stats savings={state.savings} goal={L.goal} joy={state.joy} minJoy={L.minJoy} cash={state.cash} goalPct={goalPct} />
      <p className="text-sm text-muted">
        This week: +₹{L.income} pocket money, −₹{L.needs} for needs (travel, lunch). You have ₹{cashBeforeEvent(state, L)} to work with.
      </p>

      <div className="rounded-band border border-line bg-surface p-4">
        <p className="text-lg font-semibold">{event.text}</p>
        <ul className="mt-3 grid gap-2">
          {event.choices.map((c, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={choice !== null}
                onClick={() => setChoice(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-band border-2 bg-bg p-3 text-left transition-colors",
                  choice === i ? TAG_CLASS[c.tag] : "border-line",
                  choice === null ? "hover:border-accent" : choice !== i && "opacity-50",
                )}
              >
                <span className="font-medium">{c.label}</span>
                <span className="shrink-0 text-sm font-bold">{c.cash === 0 ? "₹0" : c.cash > 0 ? `+₹${c.cash}` : `−₹${-c.cash}`}</span>
              </button>
            </li>
          ))}
        </ul>
        {choice !== null && (
          <p className={cn("mt-3 rounded-band border-l-4 bg-surface-2 p-3 text-sm", TAG_CLASS[event.choices[choice].tag])} aria-live="polite">
            <strong>{TAG_LABEL[event.choices[choice].tag]}.</strong> {event.choices[choice].why}
          </p>
        )}
      </div>

      {choice !== null && (
        <div className="rounded-band border border-line bg-surface p-4">
          {available < 0 ? (
            <p className="text-sm">
              You&apos;re ₹{-available} short this week.{" "}
              {state.savings > 0 ? "It will come out of your savings." : "With no savings to fall back on, you'll run out of money."}
            </p>
          ) : (
            <>
              <label htmlFor="save" className="font-semibold">
                Save this week: ₹{Math.min(save, canSaveUpTo)}
              </label>
              <input
                id="save"
                type="range"
                min={0}
                max={canSaveUpTo}
                step={10}
                value={Math.min(save, canSaveUpTo)}
                onChange={(e) => setSave(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--accent)]"
              />
              <p className="text-xs text-muted">Keep the rest as cash for next week. Saving everything leaves no room for surprises.</p>
              {L.interestPct > 0 && !risky && <p className="mt-1 text-xs text-muted">Your savings earn {L.interestPct}% every week.</p>}
              {L.riskyOption && (
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={risky} onChange={(e) => setRisky(e.target.checked)} className="mt-1" />
                  <span>
                    Put my savings in the risky option this week (could grow up to 8%, or lose 5%, instead of a steady {L.interestPct}%).
                  </span>
                </label>
              )}
            </>
          )}
          <Button className="mt-3" onClick={nextWeek}>
            {state.week + 1 === L.weeks ? "Finish the month" : "Next week"}
          </Button>
        </div>
      )}
    </section>
  );
}

function Stats({ savings, goal, joy, minJoy, cash, goalPct }: { savings: number; goal: number; joy: number; minJoy: number; cash: number; goalPct: number }) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-band bg-surface p-3">
        <dt className="text-xs font-bold uppercase text-muted">Savings</dt>
        <dd className="text-xl font-black">₹{savings}</dd>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${goalPct}% of the ₹${goal} goal`}>
          <div className="h-full bg-mint" style={{ width: `${goalPct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted">Goal ₹{goal}</p>
      </div>
      <div className="rounded-band bg-surface p-3">
        <dt className="text-xs font-bold uppercase text-muted">Cash</dt>
        <dd className="text-xl font-black">₹{Math.max(0, cash)}</dd>
      </div>
      <div className="rounded-band bg-surface p-3">
        <dt className="text-xs font-bold uppercase text-muted">Joy</dt>
        <dd className={cn("text-xl font-black", joy < minJoy && "text-coral")}>{joy}</dd>
        <p className="mt-1 text-xs text-muted">Keep above {minJoy}</p>
      </div>
    </dl>
  );
}
