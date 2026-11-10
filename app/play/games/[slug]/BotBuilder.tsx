"use client";

import { useMemo, useState } from "react";
import { GameShell, type RunProps, type ShellLevel } from "@/components/kid/GameShell";
import { Button } from "@/components/ui/button";
import { botRun, runBot, train, type BotConfig } from "@/lib/games/bot-builder";
import { cn } from "@/lib/utils";

type Props = { config: BotConfig; levels: ShellLevel[]; xpToday: number; title: string; intro: string; preview?: boolean };

export function BotBuilder({ config, levels, xpToday, title, intro, preview = false }: Props) {
  const local = preview ? (seed: number, level: number, inputs: unknown) => runBot(config, level, seed, inputs as Parameters<typeof runBot>[3]) : undefined;
  return (
    <GameShell slug="bot-builder" title={title} intro={intro} levels={levels} xpToday={xpToday} local={local} backHref={preview ? "/hq/content/games/bot-builder" : undefined}>
      {(run) => <BotRun key={`${run.seed}-${run.level}`} config={config} {...run} />}
    </GameShell>
  );
}

function BotRun({ config, seed, level, finish, busy }: RunProps & { config: BotConfig }) {
  const run = useMemo(() => botRun(config, level, seed), [config, level, seed]);
  const L = run.level;
  const [labels, setLabels] = useState<(number | null)[]>(run.train.map(() => null));
  const [stage, setStage] = useState<"label" | "test" | "prompt">("label");
  const [prompts, setPrompts] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);

  const allLabelled = labels.every((l) => l !== null);
  const predictions = useMemo(() => {
    if (stage === "label") return [];
    const classify = train(run.train.map((t, i) => ({ text: t.text, label: labels[i] ?? 0 })));
    return run.test.map((t) => ({ ...t, predicted: classify(t.text) }));
  }, [stage, run, labels]);
  const correct = predictions.filter((p) => p.predicted === p.label).length;

  if (stage === "label") {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-black">{L.task}</h2>
        <p className="text-muted">
          Label each example. The bot learns only from what you teach it, so take care. Step 1 of 3.
        </p>
        <ol className="space-y-2">
          {run.train.map((item, i) => (
            <li key={i} className="rounded-band border border-line bg-surface p-3">
              <p className="font-medium">“{item.text}”</p>
              <div className="mt-2 flex gap-2" role="radiogroup" aria-label={`Label for example ${i + 1}`}>
                {L.labels.map((name, label) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={labels[i] === label}
                    onClick={() => setLabels((ls) => ls.map((v, j) => (j === i ? label : v)))}
                    className={cn("rounded-full border-2 px-3 py-1 text-sm font-semibold", labels[i] === label ? "border-accent bg-accent text-on-accent" : "border-line bg-bg")}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <Button disabled={!allLabelled} onClick={() => setStage("test")}>
          Train the bot
        </Button>
      </section>
    );
  }

  if (stage === "test") {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-black">Testing on new examples</h2>
        <p className="text-muted">Step 2 of 3. The bot has never seen these. How did your training do?</p>
        <ol className="space-y-2">
          {predictions.map((p, i) => (
            <li key={i} className={cn("rounded-band border-2 bg-surface p-3", p.predicted === p.label ? "border-mint" : "border-coral")}>
              <p className="font-medium">“{p.text}”</p>
              <p className="mt-1 text-sm">
                Bot said <strong>{L.labels[p.predicted]}</strong> {p.predicted === p.label ? "✓ correct" : `✗ it's really ${L.labels[p.label]}`}
              </p>
            </li>
          ))}
        </ol>
        <p className="text-lg font-bold">
          Accuracy: {Math.round((correct / Math.max(1, predictions.length)) * 100)}% (goal {L.winAccuracy}%)
        </p>
        <p className="text-sm text-muted">The bot spots words it saw in your examples. Wrong labels teach it wrong lessons: that&apos;s why good data matters.</p>
        <Button onClick={() => setStage("prompt")}>Next: talk to the bot</Button>
      </section>
    );
  }

  const step = run.prompts[prompts.length];
  if (!step) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-black">Bot built!</h2>
        <p className="text-muted">Let&apos;s see how it did overall.</p>
        <Button onClick={() => finish({ labels: labels.map((l) => l ?? 0), prompts })} disabled={busy}>
          {busy ? "Checking…" : "See my result"}
        </Button>
      </section>
    );
  }
  const option = picked !== null ? step.options[picked] : null;
  return (
    <section className="space-y-4">
      <p className="text-sm font-semibold text-muted">Step 3 of 3 · Prompt {prompts.length + 1} of {run.prompts.length}</p>
      <h2 className="text-xl font-black">{step.goal}</h2>
      <p className="text-muted">Which prompt would you send?</p>
      <ul className="grid gap-2">
        {step.options.map((o, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={cn(
                "w-full rounded-band border-2 bg-bg p-3 text-left font-mono text-sm transition-colors",
                picked === i ? (o.points === 2 ? "border-mint" : o.points === 1 ? "border-sky" : "border-coral") : "border-line",
                picked === null ? "hover:border-accent" : picked !== i && "opacity-50",
              )}
            >
              {o.prompt}
            </button>
          </li>
        ))}
      </ul>
      {option && (
        <div className="space-y-2" aria-live="polite">
          <div className="rounded-band bg-surface-2 p-3 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Bot replies</p>
            <p className="mt-1">{option.response}</p>
          </div>
          <p className="text-sm">
            <strong>{option.points === 2 ? "Great prompt." : option.points === 1 ? "Close." : "Oops, good try."}</strong> {option.why}
          </p>
          <Button
            onClick={() => {
              setPrompts((p) => [...p, picked!]);
              setPicked(null);
            }}
          >
            Continue
          </Button>
        </div>
      )}
    </section>
  );
}
