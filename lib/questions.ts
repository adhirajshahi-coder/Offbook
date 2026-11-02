/**
 * Question storage format, client-safe views and answer checking (PRD §7.5,
 * §7.6). Answers live only on the server: `toClient` strips them, and
 * `checkAnswer` runs in server actions.
 */

import type { QuestionSeed } from "@/supabase/seed-data/lesson-types";

export type QuestionType =
  | "multiple_choice"
  | "scenario"
  | "multi_select"
  | "order"
  | "match_pairs"
  | "slider"
  | "short_answer";

/** A row of the `questions` table, as the server reads it. */
export type QuestionRow = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: unknown;
  answer: unknown;
  explanation: string;
  hint1: string | null;
  hint2: string | null;
  difficulty: number;
  variant_group: string | null;
  skill_id: string | null;
};

/** What the browser gets: no answer. */
export type ClientQuestion =
  | { id: string; type: "multiple_choice" | "scenario"; prompt: string; options: string[] }
  | { id: string; type: "multi_select"; prompt: string; options: string[] }
  | { id: string; type: "order"; prompt: string; items: string[] }
  | { id: string; type: "match_pairs"; prompt: string; left: string[]; right: string[] }
  | { id: string; type: "slider"; prompt: string; min: number; max: number; step: number; unit: string }
  | { id: string; type: "short_answer"; prompt: string; checklist: string[]; minLength: number };

export type Response =
  | { index: number }
  | { indexes: number[] }
  | { order: string[] }
  | { pairs: Record<string, string> }
  | { value: number }
  | { text: string };

/** Seed format → DB columns. */
export function toRow(q: QuestionSeed): { type: QuestionType; prompt: string; options: unknown; answer: unknown } {
  switch (q.type) {
    case "multiple_choice":
    case "scenario":
      return { type: q.type, prompt: q.prompt, options: q.options, answer: { index: q.answer } };
    case "multi_select":
      return { type: q.type, prompt: q.prompt, options: q.options, answer: { indexes: [...q.answer].sort() } };
    case "order":
      return { type: q.type, prompt: q.prompt, options: q.items, answer: { order: q.items } };
    case "match_pairs":
      return {
        type: q.type,
        prompt: q.prompt,
        options: { left: q.pairs.map((p) => p[0]), right: q.pairs.map((p) => p[1]) },
        answer: { pairs: q.pairs },
      };
    case "slider":
      return {
        type: q.type,
        prompt: q.prompt,
        options: { min: q.min, max: q.max, step: q.step, unit: q.unit },
        answer: { value: q.answer, tolerance: q.tolerance },
      };
    case "short_answer":
      return { type: q.type, prompt: q.prompt, options: { checklist: q.checklist, minLength: q.minLength }, answer: {} };
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Strip the answer; shuffle where the order would give it away. */
export function toClient(q: QuestionRow, random: () => number = Math.random): ClientQuestion {
  const o = q.options as never;
  switch (q.type) {
    case "multiple_choice":
    case "scenario":
    case "multi_select":
      // Option order is kept so answer indexes stay valid; authors vary the position.
      return { id: q.id, type: q.type, prompt: q.prompt, options: o as string[] };
    case "order": {
      const items = o as string[];
      let shuffled = shuffle(items, random);
      // Never hand over the answer already in order.
      for (let i = 0; i < 5 && items.length > 1 && shuffled.every((v, k) => v === items[k]); i++) shuffled = shuffle(items, random);
      return { id: q.id, type: q.type, prompt: q.prompt, items: shuffled };
    }
    case "match_pairs": {
      const { left, right } = o as { left: string[]; right: string[] };
      return { id: q.id, type: q.type, prompt: q.prompt, left, right: shuffle(right, random) };
    }
    case "slider": {
      const s = o as { min: number; max: number; step: number; unit: string };
      return { id: q.id, type: q.type, prompt: q.prompt, ...s };
    }
    case "short_answer": {
      const s = o as { checklist: string[]; minLength: number };
      return { id: q.id, type: q.type, prompt: q.prompt, ...s };
    }
  }
}

/** Is this response correct? Pure, so it's unit-tested. */
export function checkAnswer(q: Pick<QuestionRow, "type" | "options" | "answer">, r: Response): boolean {
  const a = q.answer as Record<string, unknown>;
  switch (q.type) {
    case "multiple_choice":
    case "scenario":
      return "index" in r && r.index === a.index;
    case "multi_select": {
      if (!("indexes" in r)) return false;
      const want = (a.indexes as number[]).slice().sort();
      const got = [...new Set(r.indexes)].sort();
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case "order": {
      if (!("order" in r)) return false;
      const want = a.order as string[];
      return want.length === r.order.length && want.every((v, i) => v === r.order[i]);
    }
    case "match_pairs": {
      if (!("pairs" in r)) return false;
      const want = a.pairs as [string, string][];
      return want.every(([left, right]) => r.pairs[left] === right) && Object.keys(r.pairs).length === want.length;
    }
    case "slider": {
      if (!("value" in r) || !Number.isFinite(r.value)) return false;
      return Math.abs(r.value - (a.value as number)) <= (a.tolerance as number);
    }
    case "short_answer": {
      if (!("text" in r)) return false;
      return isMeaningfulText(r.text, (q.options as { minLength: number }).minLength);
    }
  }
}

/**
 * Minimum quality check for free text (PRD §8 anti-cheat): long enough and
 * not just one character or word repeated.
 */
export function isMeaningfulText(text: string, minLength: number): boolean {
  const t = text.trim();
  if (t.length < minLength) return false;
  const letters = t.replace(/[^\p{L}\p{N}]/gu, "");
  if (new Set(letters.toLowerCase()).size < 4) return false;
  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  return new Set(words).size >= Math.min(3, words.length);
}
