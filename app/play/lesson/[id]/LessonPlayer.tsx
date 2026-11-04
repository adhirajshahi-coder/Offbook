"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  answerStepQuestion,
  completeStep,
  getStepQuestion,
  type AnswerResult,
  type Celebration,
  type QuestionPayload,
} from "@/app/play/learn/actions";
import { previewAnswer, previewQuestion } from "@/app/hq/content/lessons/preview-actions";
import { Kube } from "@/components/kid/Kube";
import { HintLadder, QuestionView } from "@/components/kid/QuestionView";
import { VideoPlayer } from "@/components/kid/VideoPlayer";
import { Visual } from "@/components/kid/Visual";
import { Button, buttonClass } from "@/components/ui/button";
import { celebrate, feedbackCorrect, feedbackOops } from "@/lib/client/feedback";
import type { Response } from "@/lib/questions";
import { cn } from "@/lib/utils";

export type PlayerStep =
  | { id: string; type: "study_deck"; label?: string; cards: { title: string; body: string; visual: string }[] }
  | { id: string; type: "practice"; label?: string; groups: string[] }
  | { id: string; type: "make"; prompt: string; rubric: string[] }
  | { id: string; type: "reflect"; prompt: string }
  | {
      id: string;
      type: "video";
      label?: string;
      video: { playbackId: string; token: string; thumbnailToken: string; title: string; captionsUrl: string | null } | null;
      startSec: number | null;
      endSec: number | null;
      minWatchPct: number;
    };

type PlayerApi = {
  getQuestion: (stepId: string, group: string, exclude: string[]) => Promise<QuestionPayload>;
  answer: (input: { stepId: string; questionId: string; response: Response; hintsUsed: number; ms: number }) => Promise<AnswerResult>;
};
// Live actions record progress; preview actions (staff) check answers without writing anything.
const LIVE: PlayerApi = { getQuestion: getStepQuestion, answer: answerStepQuestion };
const PREVIEW: PlayerApi = { getQuestion: previewQuestion, answer: (i) => previewAnswer(i) };
const ApiContext = createContext<PlayerApi>(LIVE);

const STEP_NAME: Record<PlayerStep["type"], string> = {
  study_deck: "Study",
  practice: "Try",
  make: "Make",
  reflect: "Reflect",
  video: "Watch",
};

export function LessonPlayer({
  lessonTitle,
  courseSlug,
  steps,
  startAt,
  preview = false,
  exitHref,
}: {
  lessonTitle: string;
  courseSlug: string;
  steps: PlayerStep[];
  startAt: number;
  /** Staff preview: same player, nothing recorded. */
  preview?: boolean;
  exitHref?: string;
}) {
  const backHref = exitHref ?? `/play/course/${courseSlug}`;
  const [current, setCurrent] = useState(Math.min(startAt, steps.length - 1));
  const [earned, setEarned] = useState(0);
  const [finished, setFinished] = useState<Celebration | null>(startAt >= steps.length ? { xp: 0 } : null);
  const [error, setError] = useState<string | null>(null);

  async function done(payload: Parameters<typeof completeStep>[0]) {
    setError(null);
    if (preview) {
      if (current === steps.length - 1) setFinished({ xp: 0 });
      else setCurrent((c) => c + 1);
      return;
    }
    const r = await completeStep(payload);
    if (r.error) {
      setError(r.error);
      return;
    }
    setEarned((e) => e + r.xp);
    if (r.lessonComplete || current === steps.length - 1) {
      celebrate(r.levelUp ? "big" : "small");
      setFinished({ ...r, xp: earned + r.xp });
    } else {
      setCurrent((c) => c + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (finished) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-12 text-center">
        <Kube expression="celebrate" size={120} />
        <h1 className="text-3xl font-black">Lesson done!</h1>
        <p className="text-lg">{lessonTitle}</p>
        {finished.xp > 0 && <p className="rounded-full bg-sun px-4 py-1 font-bold text-ink">+{finished.xp} XP</p>}
        {finished.levelUp && <p className="font-semibold">You reached level {finished.levelUp}!</p>}
        {finished.badges?.map((b) => (
          <p key={b} className="rounded-full bg-mint px-4 py-1 font-semibold text-ink">
            New badge: {b}
          </p>
        ))}
        <Link href={backHref} className={buttonClass("primary", "mt-2")}>
          Back to the course
        </Link>
        <Link href="/play" className="text-sm text-muted underline underline-offset-4">
          Today
        </Link>
      </div>
    );
  }

  const step = steps[current];
  return (
    <ApiContext.Provider value={preview ? PREVIEW : LIVE}>
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5">
      {preview && (
        <p role="status" className="rounded-band border border-sky bg-sky/15 px-3 py-2 text-sm">
          Preview as a student. Nothing you do here is saved.
        </p>
      )}
      <header className="flex items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-muted underline underline-offset-4">
          Leave lesson
        </Link>
        <p className="text-sm font-semibold text-muted">{earned > 0 ? `+${earned} XP` : ""}</p>
      </header>
      <div>
        <p className="text-sm font-semibold text-muted">{lessonTitle}</p>
        <ol className="mt-2 flex gap-1" aria-label="Lesson steps">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={cn("h-2 flex-1 rounded-full", i < current ? "bg-mint" : i === current ? "bg-accent" : "bg-surface-2")}
              aria-label={`${"label" in s && s.label ? s.label : STEP_NAME[s.type]}${i < current ? ", done" : i === current ? ", now" : ""}`}
            />
          ))}
        </ol>
        <p className="mt-2 font-display text-xl font-black">{"label" in step && step.label ? step.label : STEP_NAME[step.type]}</p>
      </div>

      {error && (
        <p role="alert" className="rounded-band border border-coral bg-coral/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {step.type === "study_deck" && <Deck key={step.id} cards={step.cards} onDone={() => done({ stepId: step.id })} />}
      {step.type === "practice" && <Practice key={step.id} step={step} onDone={(stats) => done({ stepId: step.id, stats })} />}
      {step.type === "make" && <Make key={step.id} step={step} onDone={(text) => done({ stepId: step.id, text })} />}
      {step.type === "reflect" && <Reflect key={step.id} step={step} onDone={(text) => done({ stepId: step.id, text })} />}
      {step.type === "video" && <Watch key={step.id} step={step} onDone={(watchPct) => done({ stepId: step.id, watchPct })} />}
    </div>
    </ApiContext.Provider>
  );
}

// ---------------------------------------------------------------------------

function Deck({ cards, onDone }: { cards: { title: string; body: string; visual: string }[]; onDone: () => Promise<void> }) {
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const startX = useRef<number | null>(null);
  const card = cards[i];
  const last = i === cards.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, cards.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards.length]);

  return (
    <div className="flex flex-col gap-4">
      <article
        className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-band border border-line bg-surface p-6 text-center"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (dx < -40) setI((x) => Math.min(x + 1, cards.length - 1));
          if (dx > 40) setI((x) => Math.max(x - 1, 0));
          startX.current = null;
        }}
        aria-live="polite"
      >
        <Visual name={card.visual} className="h-20 w-20 text-text" />
        <h2 className="text-2xl font-black">{card.title}</h2>
        <p className="max-w-md text-lg">{card.body}</p>
      </article>
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>
          Back
        </Button>
        <p className="text-sm text-muted">
          {i + 1} of {cards.length}
        </p>
        {last ? (
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDone();
              setBusy(false);
            }}
          >
            Try it
          </Button>
        ) : (
          <Button onClick={() => setI(i + 1)}>Next</Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Stats = { mistakes: number; bounceBacks: number; hintsUsed: number };

/** Oops → Why → Retry with a fresh variant. Unlimited retries, no hearts. */
function Practice({ step, onDone }: { step: { id: string; groups: string[] }; onDone: (s: Stats) => Promise<void> }) {
  const [groupIndex, setGroupIndex] = useState(0);
  const [payload, setPayload] = useState<QuestionPayload | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [hints, setHints] = useState(0);
  const [missedThisGroup, setMissedThisGroup] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ mistakes: 0, bounceBacks: 0, hintsUsed: 0 });
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const api = useContext(ApiContext);
  const shownAt = useRef(0);

  async function load(index: number, exclude: string[]) {
    setLoadError(null);
    try {
      const p = await api.getQuestion(step.id, step.groups[index], exclude);
      setPayload(p);
      setResult(null);
      setHints(0);
      setSeen((s) => [...s, p.question.id]);
      shownAt.current = Date.now();
    } catch {
      setLoadError("That question didn't load. Try again.");
    }
  }

  const started = useRef(false);
  useEffect(() => {
    // Initial question for this step. The ref stops a second load (and a
    // swapped question) when effects run twice in development.
    if (started.current) return;
    started.current = true;
    void load(0, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function answer(response: Response) {
    if (!payload) return;
    setBusy(true);
    const r = await api.answer({
      stepId: step.id,
      questionId: payload.question.id,
      response,
      hintsUsed: hints,
      ms: Date.now() - shownAt.current,
    });
    setBusy(false);
    setResult(r);
    setStats((s) => ({
      mistakes: s.mistakes + (r.correct ? 0 : 1),
      bounceBacks: s.bounceBacks + (r.correct && missedThisGroup ? 1 : 0),
      hintsUsed: s.hintsUsed + (r.correct ? hints : 0),
    }));
    if (r.correct) feedbackCorrect();
    else {
      feedbackOops();
      setMissedThisGroup(true);
    }
  }

  async function next() {
    if (!result) return;
    if (!result.correct) {
      await load(groupIndex, seen); // fresh variant, same idea
      return;
    }
    if (groupIndex === step.groups.length - 1) {
      setBusy(true);
      await onDone(stats);
      setBusy(false);
      return;
    }
    setMissedThisGroup(false);
    setGroupIndex(groupIndex + 1);
    await load(groupIndex + 1, seen);
  }

  if (loadError) {
    return (
      <div className="rounded-band border border-line bg-surface p-5">
        <p>{loadError}</p>
        <Button className="mt-3" onClick={() => load(groupIndex, seen)}>
          Try again
        </Button>
      </div>
    );
  }
  if (!payload) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-4 rounded-band border border-line bg-surface p-5">
      <p className="text-sm text-muted">
        Question {groupIndex + 1} of {step.groups.length}
      </p>
      <QuestionView key={payload.question.id} question={payload.question} disabled={busy || result !== null} onSubmit={answer} />
      {!result && <HintLadder hint1={payload.hint1} hint2={payload.hint2} used={hints} onUse={() => setHints((h) => h + 1)} />}
      {result && (
        <div
          role="status"
          className={cn("flex items-start gap-3 rounded-band border-2 p-4", result.correct ? "border-mint bg-mint/15" : "border-coral bg-coral/10")}
        >
          <Kube expression={result.correct ? "happy" : "oops"} size={48} animate={false} label="" />
          <div className="flex-1">
            <p className="font-semibold">
              {result.correct ? (missedThisGroup ? "✓ Bounced back! Nice." : "✓ Spot on!") : "Oops, good try."}
            </p>
            <p className="mt-1">
              {result.correct ? "" : "Here's why: "}
              {result.explanation}
            </p>
            <Button className="mt-3" disabled={busy} onClick={next}>
              {result.correct ? (groupIndex === step.groups.length - 1 ? "Finish" : "Next question") : "Try a fresh one"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Watch step: Try unlocks after most of the clip is watched (PRD §8). Rewatching is fine. */
function Watch({ step, onDone }: { step: Extract<PlayerStep, { type: "video" }>; onDone: (watchPct: number) => Promise<void> }) {
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  if (!step.video) {
    // No playable video yet: the study cards cover this idea, so carry on.
    return (
      <div className="rounded-band border border-line bg-surface p-5">
        <p className="text-muted">The video for this step is on its way. The cards cover the same idea, so carry on.</p>
        <Button className="mt-3" onClick={() => onDone(100)}>
          Continue
        </Button>
      </div>
    );
  }
  const ready = pct >= step.minWatchPct;
  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer
        playbackId={step.video.playbackId}
        token={step.video.token}
        thumbnailToken={step.video.thumbnailToken}
        title={step.video.title}
        startSec={step.startSec}
        endSec={step.endSec}
        captionsUrl={step.video.captionsUrl}
        onProgress={(p) => setPct((old) => Math.max(old, p))}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {ready ? "Nice, you've watched it." : `Watched ${pct}%. Keep going to unlock the next step.`}
        </p>
        <Button
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            await onDone(pct);
            setBusy(false);
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function Make({ step, onDone }: { step: { prompt: string; rubric: string[] }; onDone: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-3 rounded-band border border-line bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onDone(text);
        setBusy(false);
      }}
    >
      <p className="text-lg font-semibold">{step.prompt}</p>
      <ul className="text-sm text-muted">
        {step.rubric.map((r) => (
          <li key={r}>✓ {r}</li>
        ))}
      </ul>
      <label htmlFor="make-text" className="sr-only">
        What you did
      </label>
      <textarea
        id="make-text"
        rows={5}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="rounded-band border-2 border-line bg-bg px-3 py-2 text-base text-text"
      />
      <p className="text-xs text-muted">Saved to your portfolio drafts. Only you and your parent can see it.</p>
      <Button type="submit" disabled={busy || text.trim().length < 20}>
        Save
      </Button>
    </form>
  );
}

function Reflect({ step, onDone }: { step: { prompt: string }; onDone: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const finish = async (t: string) => {
    setBusy(true);
    await onDone(t);
    setBusy(false);
  };
  return (
    <div className="flex flex-col gap-3 rounded-band border border-line bg-surface p-5">
      <label htmlFor="reflect-text" className="text-lg font-semibold">
        {step.prompt}
      </label>
      <input
        id="reflect-text"
        maxLength={300}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="min-h-11 rounded-band border-2 border-line bg-bg px-3 text-base text-text"
      />
      <p className="text-xs text-muted">Optional. Private to you and your parent.</p>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => finish(text)}>
          Finish lesson
        </Button>
        {!text && (
          <Button variant="ghost" disabled={busy} onClick={() => finish("")}>
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}
