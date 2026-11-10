"use client";

import { useMemo, useState } from "react";
import { GameShell, type RunProps, type ShellLevel } from "@/components/kid/GameShell";
import { Button } from "@/components/ui/button";
import { runSprint, sprintRun, type SprintConfig } from "@/lib/games/startup-sprint";
import { cn } from "@/lib/utils";

type Props = { config: SprintConfig; levels: ShellLevel[]; xpToday: number; title: string; intro: string; preview?: boolean };

export function StartupSprint({ config, levels, xpToday, title, intro, preview = false }: Props) {
  const local = preview ? (seed: number, level: number, inputs: unknown) => runSprint(config, level, seed, inputs as Parameters<typeof runSprint>[3]) : undefined;
  return (
    <GameShell slug="startup-sprint" title={title} intro={intro} levels={levels} xpToday={xpToday} local={local} backHref={preview ? "/hq/content/games/startup-sprint" : undefined}>
      {(run) => <SprintRun key={`${run.seed}-${run.level}`} config={config} {...run} />}
    </GameShell>
  );
}

function SprintRun({ config, seed, level, finish, busy }: RunProps & { config: SprintConfig }) {
  const run = useMemo(() => sprintRun(config, level, seed), [config, level, seed]);
  const L = run.level;
  const [problem, setProblem] = useState<number | null>(null);
  const [questions, setQuestions] = useState<number[]>([]);
  const [asked, setAsked] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [channels, setChannels] = useState<string[]>([]);

  const p = problem !== null ? run.problems[problem] : null;
  // Live results so far: the same engine the server uses, run on the weeks chosen.
  const sim = useMemo(() => {
    if (problem === null || price === null || !channels.length) return null;
    const padded = [...channels, ...Array(L.weeks - channels.length).fill(channels[channels.length - 1])];
    return runSprint(config, level, seed, { problem, questions, price, channels: padded });
  }, [config, level, seed, problem, questions, price, channels, L.weeks]);

  if (!p) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-black">Pick a problem to solve</h2>
        <p className="text-muted">
          {L.title}: {L.weeks} weeks, ₹{L.startCash} to start, goal ₹{L.goalProfit} profit.
        </p>
        <ul className="grid gap-3">
          {run.problems.map((x, i) => (
            <li key={x.id}>
              <button type="button" onClick={() => setProblem(i)} className="w-full rounded-band border-2 border-line bg-surface p-4 text-left hover:border-accent">
                <span className="block text-lg font-bold">{x.title}</span>
                <span className="block text-sm text-muted">
                  Customers: {x.customer} · Idea: {x.product}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!asked) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-black">Interview your customers</h2>
        <p className="text-muted">
          You have time for {L.interviewPicks} questions with {p.customer.toLowerCase()}. Good questions ask about what people actually do, not what they might do.
        </p>
        <ul className="grid gap-2">
          {p.questions.map((q, i) => {
            const on = questions.includes(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={!on && questions.length >= L.interviewPicks}
                  onClick={() => setQuestions((qs) => (on ? qs.filter((x) => x !== i) : [...qs, i]))}
                  className={cn("w-full rounded-band border-2 bg-bg p-3 text-left transition-colors disabled:opacity-50", on ? "border-accent" : "border-line hover:border-accent")}
                >
                  {on ? "✓ " : ""}“{q.q}”
                </button>
              </li>
            );
          })}
        </ul>
        <Button disabled={questions.length < L.interviewPicks} onClick={() => setAsked(true)}>
          Ask these questions
        </Button>
      </section>
    );
  }

  if (price === null) {
    return <PriceStep idea={p.product} costEach={p.unitCost} insights={questions.map((i) => ({ q: p.questions[i].q, a: p.questions[i].insight, good: p.questions[i].good }))} onSet={setPrice} />;
  }

  if (channels.length < L.weeks) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-black">
          Week {channels.length + 1} of {L.weeks}: how will you find customers?
        </h2>
        {sim && <WeekTable weeks={sim.weeks.slice(0, channels.length)} />}
        <ul className="grid gap-2 sm:grid-cols-2">
          {config.channels.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setChannels((cs) => [...cs, c.id])} className="flex h-full w-full flex-col rounded-band border-2 border-line bg-surface p-3 text-left hover:border-accent">
                <span className="font-bold">{c.label}</span>
                <span className="text-sm text-muted">
                  ₹{c.cost} · {c.note}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Selling {p.product.toLowerCase()} at ₹{price} each (costs ₹{p.unitCost} to make).
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">Sprint over!</h2>
      {sim && <WeekTable weeks={sim.weeks} />}
      {sim && (
        <p className="text-lg font-bold">
          Profit: ₹{sim.profit} (goal ₹{L.goalProfit}) · Product fit {sim.fit}%
        </p>
      )}
      <Button onClick={() => finish({ problem, questions, price, channels })} disabled={busy}>
        {busy ? "Checking…" : "See my result"}
      </Button>
    </section>
  );
}

function PriceStep({ idea, costEach, insights, onSet }: { idea: string; costEach: number; insights: { q: string; a: string; good: boolean }[]; onSet: (n: number) => void }) {
  const [value, setValue] = useState(String(costEach * 3));
  const n = Math.round(Number(value));
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">What you learned</h2>
      <ul className="space-y-2">
        {insights.map((x) => (
          <li key={x.q} className={cn("rounded-band border-l-4 bg-surface p-3 text-sm", x.good ? "border-mint" : "border-sky")}>
            <p className="font-semibold">“{x.q}”</p>
            <p className="text-muted">{x.a}</p>
          </li>
        ))}
      </ul>
      <label htmlFor="price" className="block text-lg font-bold">
        Set your price for {idea.toLowerCase()} (₹)
      </label>
      <input id="price" type="number" inputMode="numeric" min={1} value={value} onChange={(e) => setValue(e.target.value)} className="min-h-11 w-40 rounded-band border-2 border-line bg-bg px-3 text-lg" />
      <p className="text-sm text-muted">
        Each one costs ₹{costEach} to make. {n > costEach ? `You'd make ₹${n - costEach} on each sale.` : "At this price you lose money on every sale."}
      </p>
      <Button disabled={!(n >= 1)} onClick={() => onSet(n)}>
        Set price
      </Button>
    </section>
  );
}

function WeekTable({ weeks }: { weeks: { week: number; channel: string; sales: number; revenue: number; costs: number; cash: number }[] }) {
  if (!weeks.length) return null;
  return (
    <div className="overflow-x-auto rounded-band border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            {["Week", "Marketing", "Sold", "Money in", "Costs", "Cash"].map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week} className="border-t border-line">
              <td className="px-3 py-2">{w.week}</td>
              <td className="px-3 py-2">{w.channel}</td>
              <td className="px-3 py-2 tabular-nums">{w.sales}</td>
              <td className="px-3 py-2 tabular-nums">₹{w.revenue}</td>
              <td className="px-3 py-2 tabular-nums">₹{w.costs}</td>
              <td className="px-3 py-2 font-semibold tabular-nums">₹{w.cash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
