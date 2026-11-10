"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell, type RunProps, type ShellLevel } from "@/components/kid/GameShell";
import { Button } from "@/components/ui/button";
import { GOAL_LABEL, runSay, sayRun, type SayConfig } from "@/lib/games/say-it-better";
import { cn } from "@/lib/utils";

type Props = { config: SayConfig; levels: ShellLevel[]; xpToday: number; title: string; intro: string; preview?: boolean };

export function SayItBetter({ config, levels, xpToday, title, intro, preview = false }: Props) {
  const local = preview ? (seed: number, level: number, inputs: unknown) => runSay(config, level, seed, inputs as Parameters<typeof runSay>[3]) : undefined;
  return (
    <GameShell slug="say-it-better" title={title} intro={intro} levels={levels} xpToday={xpToday} local={local} backHref={preview ? "/hq/content/games/say-it-better" : undefined}>
      {(run) => <SayRun key={`${run.seed}-${run.level}`} config={config} {...run} />}
    </GameShell>
  );
}

const pointClass = (p: number) => (p === 2 ? "border-mint" : p === 1 ? "border-sky" : "border-coral");

function SayRun({ config, seed, level, finish, busy }: RunProps & { config: SayConfig }) {
  const { rounds, speak } = useMemo(() => sayRun(config, level, seed), [config, level, seed]);
  const [choices, setChoices] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [rubric, setRubric] = useState<boolean[]>(config.rubric.map(() => false));
  const [spoke, setSpoke] = useState(false);

  if (choices.length < rounds.length) {
    const round = rounds[choices.length];
    const option = picked !== null ? round.options[picked] : null;
    return (
      <section className="space-y-4">
        <p className="text-sm font-semibold text-muted">
          Round {choices.length + 1} of {rounds.length}
        </p>
        <div className="rounded-band border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{GOAL_LABEL[round.goal]}</p>
          <p className="mt-1 text-lg font-semibold">{round.situation}</p>
          <ul className="mt-3 grid gap-2">
            {round.options.map((o, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={picked !== null}
                  onClick={() => setPicked(i)}
                  className={cn(
                    "w-full rounded-band border-2 bg-bg p-3 text-left transition-colors",
                    picked === i ? pointClass(o.points) : "border-line",
                    picked === null ? "hover:border-accent" : picked !== i && "opacity-50",
                  )}
                >
                  “{o.text}”
                </button>
              </li>
            ))}
          </ul>
          {option && (
            <p className={cn("mt-3 rounded-band border-l-4 bg-surface-2 p-3 text-sm", pointClass(option.points))} aria-live="polite">
              <strong>{option.points === 2 ? "Spot on." : option.points === 1 ? "Getting there." : "Oops, good try."}</strong> {option.why}
            </p>
          )}
        </div>
        {option && (
          <Button
            onClick={() => {
              setChoices((c) => [...c, picked!]);
              setPicked(null);
            }}
          >
            {choices.length + 1 === rounds.length ? "Finish rounds" : "Next round"}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">Bonus: say it out loud</h2>
      <p className="text-lg">{speak}</p>
      <Recorder onDone={() => setSpoke(true)} />
      {spoke && (
        <fieldset className="rounded-band border border-line bg-surface p-4">
          <legend className="px-1 font-semibold">How did it go? Be honest. Only you see this.</legend>
          <ul className="mt-1 space-y-2">
            {config.rubric.map((r, i) => (
              <li key={r}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={rubric[i]} onChange={(e) => setRubric((x) => x.map((v, j) => (j === i ? e.target.checked : v)))} />
                  {r}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => finish({ choices, spoke, rubric })} disabled={busy}>
          {busy ? "Checking…" : "See my result"}
        </Button>
        {!spoke && <p className="self-center text-sm text-muted">You can skip the speaking part.</p>}
      </div>
    </section>
  );
}

/** 30-second practice recording. Stays on this device: never uploaded (D-068). */
function Recorder({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "done" | "unavailable">(() =>
    typeof window !== "undefined" && typeof MediaRecorder === "undefined" ? "unavailable" : "idle",
  );
  const [left, setLeft] = useState(30);
  const [url, setUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (state === "recording" && left <= 0) rec.current?.stop();
  }, [left, state]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })));
        setState("done");
        onDone();
      };
      rec.current = r;
      setLeft(30);
      r.start();
      setState("recording");
    } catch {
      setState("unavailable");
    }
  }

  if (state === "unavailable") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">No microphone? No problem: say it out loud to yourself or someone at home, then tick how it went.</p>
        <Button variant="secondary" onClick={onDone}>
          I said it out loud
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-band bg-surface p-4">
      {state === "idle" && (
        <Button variant="secondary" onClick={start}>
          🎙 Record 30 seconds
        </Button>
      )}
      {state === "recording" && (
        <div className="flex items-center gap-3">
          <span className="font-bold tabular-nums" aria-live="polite">
            Recording… {left}s
          </span>
          <Button variant="secondary" onClick={() => rec.current?.stop()}>
            Stop
          </Button>
        </div>
      )}
      {state === "done" && url && (
        <>
          <audio controls src={url} className="w-full">
            <track kind="captions" />
          </audio>
          <Button variant="ghost" onClick={start}>
            Record again
          </Button>
        </>
      )}
      <p className="text-xs text-muted">Your recording stays on this device. It isn&apos;t uploaded or shared.</p>
    </div>
  );
}
