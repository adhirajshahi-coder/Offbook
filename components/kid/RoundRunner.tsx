"use client";

import Link from "next/link";
import { useState } from "react";
import type { RoundPayload, RoundResult } from "@/app/play/learn/actions";
import { Kube } from "@/components/kid/Kube";
import { QuestionView } from "@/components/kid/QuestionView";
import { Button, buttonClass } from "@/components/ui/button";
import { celebrate, feedbackOops } from "@/lib/client/feedback";
import type { Response } from "@/lib/questions";
import { cn } from "@/lib/utils";

/**
 * Mission quiz, boss challenge and daily warm-up: answer every question,
 * then see results with the "why" for each. Retry fetches fresh variants.
 */
export function RoundRunner({
  kind,
  load,
  submit,
  backHref,
  backLabel,
}: {
  kind: "quiz" | "boss" | "warmup";
  load: () => Promise<RoundPayload>;
  submit: (answers: { questionId: string; response: Response }[]) => Promise<RoundResult>;
  backHref: string;
  backLabel: string;
}) {
  const [round, setRound] = useState<RoundPayload | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; response: Response }[]>([]);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const r = await load();
      setRound(r);
      setI(0);
      setAnswers([]);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't load.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(response: Response) {
    if (!round) return;
    const next = [...answers, { questionId: round.questions[i].question.id, response }];
    setAnswers(next);
    if (i < round.questions.length - 1) {
      setI(i + 1);
      return;
    }
    setBusy(true);
    try {
      const r = await submit(next);
      setResult(r);
      if (r.passed && kind !== "warmup") celebrate(kind === "boss" || r.missionComplete ? "big" : "small");
      else if (kind === "warmup") celebrate("small");
      else feedbackOops();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <Shell backHref={backHref} backLabel={backLabel}>
        <p role="alert">{error}</p>
        <Link href={backHref} className={buttonClass("secondary", "mt-3")}>
          {backLabel}
        </Link>
      </Shell>
    );
  }

  if (!round) {
    const intro =
      kind === "quiz"
        ? "Five questions from this mission. Score 80% or more to pass. Retries use fresh questions."
        : kind === "boss"
          ? "The big one. Use everything from this mission."
          : "A few quick ones from earlier lessons, so they stick.";
    return (
      <Shell backHref={backHref} backLabel={backLabel}>
        <div className="flex flex-col items-center gap-4 text-center">
          <Kube expression={kind === "boss" ? "thinking" : "happy"} size={110} />
          <h1 className="text-3xl font-black">{kind === "quiz" ? "Mission quiz" : kind === "boss" ? "Boss challenge" : "Daily warm-up"}</h1>
          <p className="max-w-md text-muted">{intro}</p>
          <Button onClick={start} disabled={busy}>
            {busy ? "Loading…" : "Start"}
          </Button>
        </div>
      </Shell>
    );
  }

  if (round.questions.length === 0) {
    return (
      <Shell backHref={backHref} backLabel={backLabel}>
        <div className="flex flex-col items-center gap-3 text-center">
          <Kube expression="sleepy" size={96} />
          <p className="text-lg font-semibold">Nothing to warm up yet.</p>
          <p className="text-muted">Finish a lesson first, then come back tomorrow.</p>
        </div>
      </Shell>
    );
  }

  if (result) {
    const right = result.results.filter((r) => r.correct).length;
    return (
      <Shell backHref={backHref} backLabel={backLabel}>
        <div className="flex flex-col items-center gap-3 text-center">
          <Kube expression={result.passed ? "celebrate" : "oops"} size={110} />
          <h1 className="text-3xl font-black">
            {kind === "warmup"
              ? "Warm-up done!"
              : result.passed
                ? kind === "boss"
                  ? "Boss beaten!"
                  : "Quiz passed!"
                : "So close. Have another go."}
          </h1>
          <p className="text-lg">
            {right} of {result.results.length} right ({result.pct}%)
            {kind !== "warmup" && !result.passed && ` · you need ${round.passPct}%`}
          </p>
          {result.xp > 0 && <p className="rounded-full bg-sun px-4 py-1 font-bold text-ink">+{result.xp} XP</p>}
          {result.missionComplete && <p className="font-semibold">Mission complete!</p>}
          {result.levelUp && <p className="font-semibold">You reached level {result.levelUp}!</p>}
          {result.badges?.map((b) => (
            <p key={b} className="rounded-full bg-mint px-4 py-1 font-semibold text-ink">
              New badge: {b}
            </p>
          ))}
        </div>
        <ol className="mt-6 flex flex-col gap-3">
          {result.results.map((r, n) => {
            const q = round.questions.find((x) => x.question.id === r.questionId)?.question;
            return (
              <li key={r.questionId} className={cn("rounded-band border-2 p-4", r.correct ? "border-mint" : "border-coral")}>
                <p className="text-sm font-semibold">
                  {r.correct ? "✓" : "✗"} Question {n + 1}: {q?.prompt}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {r.correct ? "" : "Here's why: "}
                  {r.explanation}
                </p>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {kind !== "warmup" && !result.passed && (
            <Button onClick={start} disabled={busy}>
              Try again with fresh questions
            </Button>
          )}
          <Link href={backHref} className={buttonClass(kind !== "warmup" && !result.passed ? "secondary" : "primary")}>
            {backLabel}
          </Link>
        </div>
      </Shell>
    );
  }

  const q = round.questions[i];
  return (
    <Shell backHref={backHref} backLabel={backLabel}>
      <p className="text-sm font-semibold text-muted">
        {round.title} · {i + 1} of {round.questions.length}
      </p>
      <div className="mt-3 rounded-band border border-line bg-surface p-5">
        <QuestionView key={q.question.id} question={q.question} disabled={busy} submitLabel={i === round.questions.length - 1 ? "Finish" : "Next"} onSubmit={answer} />
      </div>
    </Shell>
  );
}

function Shell({ children, backHref, backLabel }: { children: React.ReactNode; backHref: string; backLabel: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Link href={backHref} className="text-sm text-muted underline underline-offset-4">
        {backLabel}
      </Link>
      <div className="mt-4">{children}</div>
    </main>
  );
}
