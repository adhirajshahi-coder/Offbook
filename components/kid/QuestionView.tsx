"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ClientQuestion, Response } from "@/lib/questions";
import { cn } from "@/lib/utils";

/**
 * Renders any question type and collects a response. Keyboard and screen
 * reader friendly: ordering uses move buttons, matching uses selects.
 * Feedback never relies on colour alone (text + icon too, PRD §17).
 */
export function QuestionView({
  question,
  disabled,
  submitLabel = "Check",
  onSubmit,
}: {
  question: ClientQuestion;
  disabled?: boolean;
  submitLabel?: string;
  onSubmit: (r: Response) => void;
}) {
  // Keyed by question id by the parent, so state resets per question.
  const [index, setIndex] = useState<number | null>(null);
  const [indexes, setIndexes] = useState<number[]>([]);
  const [order, setOrder] = useState<string[]>(question.type === "order" ? question.items : []);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [value, setValue] = useState<number>(question.type === "slider" ? question.min : 0);
  const [touchedSlider, setTouchedSlider] = useState(false);
  const [text, setText] = useState("");

  let ready = false;
  let response: Response | null = null;
  switch (question.type) {
    case "multiple_choice":
    case "scenario":
      ready = index !== null;
      response = { index: index ?? -1 };
      break;
    case "multi_select":
      ready = indexes.length > 0;
      response = { indexes };
      break;
    case "order":
      ready = true;
      response = { order };
      break;
    case "match_pairs":
      ready = question.left.every((l) => pairs[l]);
      response = { pairs };
      break;
    case "slider":
      ready = touchedSlider;
      response = { value };
      break;
    case "short_answer":
      ready = text.trim().length >= Math.min(question.minLength, 10);
      response = { text };
      break;
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const optionClass = (selected: boolean) =>
    cn(
      "w-full rounded-band border-2 px-4 py-3 text-left font-medium transition-colors disabled:opacity-70",
      selected ? "border-accent bg-surface-2" : "border-line bg-surface hover:border-accent",
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && response && !disabled) onSubmit(response);
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-lg font-semibold">{question.prompt}</p>

      {(question.type === "multiple_choice" || question.type === "scenario") && (
        <div role="radiogroup" aria-label="Choose one" className="flex flex-col gap-2">
          {question.options.map((o, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={index === i}
              disabled={disabled}
              onClick={() => setIndex(i)}
              className={optionClass(index === i)}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {question.type === "multi_select" && (
        <div role="group" aria-label="Choose all that apply" className="flex flex-col gap-2">
          <p className="text-sm text-muted">Choose all that apply.</p>
          {question.options.map((o, i) => {
            const on = indexes.includes(i);
            return (
              <button
                key={i}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={disabled}
                onClick={() => setIndexes(on ? indexes.filter((x) => x !== i) : [...indexes, i])}
                className={optionClass(on)}
              >
                <span aria-hidden className="mr-2">{on ? "☑" : "☐"}</span>
                {o}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "order" && (
        <ol className="flex flex-col gap-2">
          <p className="text-sm text-muted">Put these in order, first at the top.</p>
          {order.map((item, i) => (
            <li key={item} className="flex items-center gap-2 rounded-band border-2 border-line bg-surface px-3 py-2">
              <span className="w-6 font-display font-black text-muted">{i + 1}</span>
              <span className="flex-1 font-medium">{item}</span>
              <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move "${item}" up`} className="rounded-lg px-2 py-1 hover:bg-surface-2 disabled:opacity-30">
                ↑
              </button>
              <button type="button" disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Move "${item}" down`} className="rounded-lg px-2 py-1 hover:bg-surface-2 disabled:opacity-30">
                ↓
              </button>
            </li>
          ))}
        </ol>
      )}

      {question.type === "match_pairs" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Match each one on the left.</p>
          {question.left.map((l, i) => (
            <div key={l} className="grid items-center gap-2 rounded-band border-2 border-line bg-surface p-3 sm:grid-cols-2">
              <label htmlFor={`match-${question.id}-${i}`} className="font-medium">
                {l}
              </label>
              <select
                id={`match-${question.id}-${i}`}
                value={pairs[l] ?? ""}
                disabled={disabled}
                onChange={(e) => setPairs({ ...pairs, [l]: e.target.value })}
                className="min-h-11 rounded-band border border-line bg-bg px-2 text-base text-text"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {question.right.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {question.type === "slider" && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`slider-${question.id}`} className="font-display text-3xl font-black">
            {question.unit === "₹" ? `₹${value.toLocaleString("en-IN")}` : `${value}${question.unit === "%" ? "%" : ""}`}
          </label>
          <input
            id={`slider-${question.id}`}
            type="range"
            min={question.min}
            max={question.max}
            step={question.step}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              setValue(Number(e.target.value));
              setTouchedSlider(true);
            }}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-sm text-muted">
            <span>{question.unit === "₹" ? `₹${question.min}` : question.min}</span>
            <span>{question.unit === "₹" ? `₹${question.max.toLocaleString("en-IN")}` : question.max}</span>
          </div>
        </div>
      )}

      {question.type === "short_answer" && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`text-${question.id}`} className="sr-only">
            Your answer
          </label>
          <textarea
            id={`text-${question.id}`}
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={600}
            className="rounded-band border-2 border-line bg-surface px-3 py-2 text-base text-text"
          />
          <ul className="text-sm text-muted">
            {question.checklist.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={!ready || disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function HintLadder({ hint1, hint2, used, onUse }: { hint1: string | null; hint2: string | null; used: number; onUse: () => void }) {
  if (!hint1) return null;
  return (
    <div className="flex flex-col gap-2 text-sm">
      {used >= 1 && <p className="rounded-band bg-sky/20 px-3 py-2">Hint: {hint1}</p>}
      {used >= 2 && hint2 && <p className="rounded-band bg-sky/20 px-3 py-2">Bigger hint: {hint2}</p>}
      {used < (hint2 ? 2 : 1) && (
        <button type="button" onClick={onUse} className="self-start font-semibold text-accent underline underline-offset-4">
          {used === 0 ? "Need a hint?" : "Still stuck? One more hint"}
        </button>
      )}
    </div>
  );
}
