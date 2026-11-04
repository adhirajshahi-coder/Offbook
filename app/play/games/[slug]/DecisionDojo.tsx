"use client";

import { useMemo, useState } from "react";
import { GameShell, type RunProps, type ShellLevel } from "@/components/kid/GameShell";
import { Button } from "@/components/ui/button";
import { dojoScenario, runDojo, type DojoConfig } from "@/lib/games/decision-dojo";
import { cn } from "@/lib/utils";

export function DecisionDojo({
  config,
  levels,
  xpToday,
  title,
  intro,
  preview = false,
}: {
  config: DojoConfig;
  levels: ShellLevel[];
  xpToday: number;
  title: string;
  intro: string;
  preview?: boolean;
}) {
  const local = preview ? (seed: number, level: number, inputs: unknown) => runDojo(config, level, seed, inputs as number[]) : undefined;
  return (
    <GameShell slug="decision-dojo" title={title} intro={intro} levels={levels} xpToday={xpToday} local={local} backHref={preview ? "/hq/content/games/decision-dojo" : undefined}>
      {(run) => <DojoRun key={`${run.seed}-${run.level}`} config={config} {...run} />}
    </GameShell>
  );
}

function pointsClass(p: number) {
  return p >= 2 ? "border-mint" : p >= 0 ? "border-sky" : "border-coral";
}

function DojoRun({ config, seed, level, finish, busy }: RunProps & { config: DojoConfig }) {
  const scenario = useMemo(() => dojoScenario(config, level, seed), [config, level, seed]);
  const [choices, setChoices] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);

  // Walk the story so far.
  let at = scenario.start;
  for (const c of choices) at = scenario.nodes[at].options[c].next;
  const node = scenario.nodes[at];
  const ending = node ? null : scenario.endings[at];

  if (ending) {
    const r = runDojo(config, level, seed, choices);
    return (
      <section className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">{scenario.title}</p>
        <h2 className="text-2xl font-black">{ending.title}</h2>
        <p className="text-lg">{ending.text}</p>
        <h3 className="pt-2 text-lg font-black">Debrief: the thinking behind each choice</h3>
        <ol className="space-y-2">
          {r.path.map((p, i) => (
            <li key={i} className={cn("rounded-band border-2 bg-surface p-3 text-sm", pointsClass(p.points))}>
              <p className="font-semibold">{p.choice}</p>
              <p className="text-muted">{p.debrief}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          Wise points: {r.points} (win at {scenario.winAt}).
        </p>
        <Button onClick={() => finish(choices)} disabled={busy}>
          {busy ? "Checking…" : "See my result"}
        </Button>
      </section>
    );
  }

  const option = picked !== null ? node.options[picked] : null;

  return (
    <section className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{scenario.title}</p>
      {choices.length === 0 && <p className="text-lg">{scenario.intro}</p>}
      <div className="rounded-band border border-line bg-surface p-4">
        <p className="text-lg font-semibold">{node.text}</p>
        <ul className="mt-3 grid gap-2">
          {node.options.map((o, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(i)}
                className={cn(
                  "w-full rounded-band border-2 bg-bg p-3 text-left font-medium transition-colors",
                  picked === i ? pointsClass(o.points) : "border-line",
                  picked === null ? "hover:border-accent" : picked !== i && "opacity-50",
                )}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
        {option && (
          <p className={cn("mt-3 rounded-band border-l-4 bg-surface-2 p-3 text-sm", pointsClass(option.points))} aria-live="polite">
            {option.debrief}
          </p>
        )}
      </div>
      {option && (
        <Button
          onClick={() => {
            setChoices((cs) => [...cs, picked!]);
            setPicked(null);
          }}
        >
          See what happens
        </Button>
      )}
    </section>
  );
}
