"use client";

import Link from "next/link";
import { useState } from "react";
import { finishGame, startGame, type GameResult } from "@/app/play/games/actions";
import { Kube } from "@/components/kid/Kube";
import { Button, buttonClass } from "@/components/ui/button";
import { GAME_DAILY_CAP, gameSessionXp } from "@/lib/games/xp";
import { celebrate, feedbackOops } from "@/lib/client/feedback";
import { cn } from "@/lib/utils";

export type ShellLevel = { level: number; title: string; open: boolean; won: boolean };

export type RunProps = { seed: number; level: number; finish: (inputs: unknown) => Promise<void>; busy: boolean };

/** HQ test play: runs the engine in the browser and records nothing. */
export type LocalRun = (seed: number, level: number, inputs: unknown) => { won: boolean; score: number; reason: string };

type Phase = { kind: "pick" } | { kind: "play"; sessionId: string; seed: number; level: number } | { kind: "result"; level: number; result: GameResult };

/**
 * Shared frame for every game (PRD §7.7): pick a level, play a seeded run,
 * then the server-checked result with XP and what to try next.
 */
export function GameShell({
  slug,
  title,
  intro,
  levels: initialLevels,
  xpToday: initialXpToday,
  local,
  backHref = "/play/games",
  children,
}: {
  slug: string;
  title: string;
  intro: string;
  levels: ShellLevel[];
  xpToday: number;
  local?: LocalRun;
  backHref?: string;
  children: (run: RunProps) => React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const [levels, setLevels] = useState(initialLevels);
  const [xpToday, setXpToday] = useState(initialXpToday);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function play(level: number) {
    setBusy(true);
    setError(null);
    try {
      const s = local ? { sessionId: "local", seed: randomSeed(), level } : await startGame(slug, level);
      setPhase({ kind: "play", ...s });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the game");
    } finally {
      setBusy(false);
    }
  }

  async function finish(inputs: unknown) {
    if (phase.kind !== "play") return;
    setBusy(true);
    setError(null);
    try {
      const result: GameResult = local ? localResult(local, phase.seed, phase.level, inputs, levels) : await finishGame(slug, phase.sessionId, inputs);
      setXpToday(result.xpToday);
      setLevels((ls) =>
        ls.map((l) => (l.level === phase.level && result.won ? { ...l, won: true } : l.level === result.nextLevel ? { ...l, open: true } : l)),
      );
      setPhase({ kind: "result", level: phase.level, result });
      if (result.won) celebrate(result.levelUp ? "big" : "small");
      else feedbackOops();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the result");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <Link href={backHref} className="text-sm text-muted underline underline-offset-4">
          ← {local ? "Back to the editor" : "All games"}
        </Link>
        {!local && (
          <p className="text-sm text-muted" aria-live="polite">
            Game XP today: {xpToday}/{GAME_DAILY_CAP}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-band border border-coral bg-surface p-3 text-sm">
          {error}
        </p>
      )}

      {local && (
        <p className="mt-3 rounded-band border border-sky bg-surface p-2 text-center text-sm">Test play: nothing is saved and no XP is awarded.</p>
      )}

      {phase.kind === "pick" && (
        <section className="mt-4 flex flex-col items-center gap-4 text-center">
          <Kube expression="thinking" size={100} />
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="max-w-md text-muted">{intro}</p>
          <ol className="grid w-full gap-3 sm:grid-cols-3">
            {levels.map((l) => (
              <li key={l.level}>
                <button
                  type="button"
                  disabled={!l.open || busy}
                  onClick={() => play(l.level)}
                  className={cn(
                    "flex h-full w-full flex-col items-start gap-1 rounded-band border-2 bg-surface p-4 text-left transition-colors",
                    l.open ? "border-line hover:border-accent" : "cursor-not-allowed border-dashed border-line opacity-60",
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-muted">Level {l.level}</span>
                  <span className="font-bold">{l.title}</span>
                  <span className="text-sm text-muted">{l.won ? "★ Won" : l.open ? "Ready" : `Win level ${l.level - 1} first`}</span>
                </button>
              </li>
            ))}
          </ol>
          {xpToday >= GAME_DAILY_CAP && <p className="text-sm text-muted">You&apos;ve earned today&apos;s game XP. You can keep playing for fun; XP resets tomorrow.</p>}
        </section>
      )}

      {phase.kind === "play" && <div className="mt-4">{children({ seed: phase.seed, level: phase.level, finish, busy })}</div>}

      {phase.kind === "result" && (
        <section className="mt-6 flex flex-col items-center gap-3 text-center">
          <Kube expression={phase.result.won ? "celebrate" : "oops"} size={110} />
          <h1 className="text-3xl font-black">{phase.result.won ? "You won!" : "Not this time"}</h1>
          <p className="max-w-md text-lg">{phase.result.reason}</p>
          <p className="text-muted">Score: {phase.result.score}</p>
          {phase.result.xp > 0 && <p className="rounded-full bg-sun px-4 py-1 font-bold text-ink">+{phase.result.xp} XP</p>}
          {local && <p className="text-sm text-muted">A student would earn {phase.result.earned} XP (before the daily cap).</p>}
          {phase.result.capped && (
            <p className="text-sm text-muted">
              {phase.result.xp === 0 ? "Today's game XP is used up." : "That's today's game XP maxed out."} Learning lessons still earns XP.
            </p>
          )}
          {phase.result.levelUp && <p className="font-semibold">You reached level {phase.result.levelUp}!</p>}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {phase.result.nextLevel !== null && (
              <Button onClick={() => play(phase.result.nextLevel!)} disabled={busy}>
                Play level {phase.result.nextLevel}
              </Button>
            )}
            <Button variant={phase.result.nextLevel !== null ? "secondary" : "primary"} onClick={() => play(phase.level)} disabled={busy}>
              Play again
            </Button>
            <button type="button" className={buttonClass("ghost")} onClick={() => setPhase({ kind: "pick" })}>
              Levels
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function localResult(run: LocalRun, seed: number, level: number, inputs: unknown, levels: ShellLevel[]): GameResult {
  const r = run(seed, level, inputs);
  const next = levels.find((l) => l.level > level)?.level ?? null;
  return { ...r, xp: 0, earned: gameSessionXp({ won: r.won, score: r.score, level }), capped: false, xpToday: 0, nextLevel: next };
}

function randomSeed() {
  return Math.floor(Math.random() * 2_000_000_000);
}
