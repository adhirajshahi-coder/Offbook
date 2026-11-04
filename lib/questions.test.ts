import { describe, expect, it } from "vitest";
import { checkAnswer, fromRow, isMeaningfulText, toClient, toRow, type QuestionRow } from "./questions";
import type { QuestionSeed } from "@/supabase/seed-data/lesson-types";

const base = { explanation: "why", hint1: "h1", hint2: "h2", difficulty: 1 as const };

function row(seed: QuestionSeed): QuestionRow {
  return { id: "q", explanation: "why", hint1: null, hint2: null, difficulty: 1, variant_group: "g", skill_id: null, ...toRow(seed) } as QuestionRow;
}

describe("checkAnswer", () => {
  it("multiple choice", () => {
    const q = row({ ...base, type: "multiple_choice", prompt: "p", options: ["a", "b", "c"], answer: 2 });
    expect(checkAnswer(q, { index: 2 })).toBe(true);
    expect(checkAnswer(q, { index: 0 })).toBe(false);
  });

  it("multi select ignores order and duplicates, needs the exact set", () => {
    const q = row({ ...base, type: "multi_select", prompt: "p", options: ["a", "b", "c", "d"], answer: [3, 1] });
    expect(checkAnswer(q, { indexes: [1, 3] })).toBe(true);
    expect(checkAnswer(q, { indexes: [3, 1, 1] })).toBe(true);
    expect(checkAnswer(q, { indexes: [1] })).toBe(false);
    expect(checkAnswer(q, { indexes: [1, 2, 3] })).toBe(false);
  });

  it("order", () => {
    const q = row({ ...base, type: "order", prompt: "p", items: ["first", "second", "third"] });
    expect(checkAnswer(q, { order: ["first", "second", "third"] })).toBe(true);
    expect(checkAnswer(q, { order: ["second", "first", "third"] })).toBe(false);
  });

  it("match pairs", () => {
    const q = row({ ...base, type: "match_pairs", prompt: "p", pairs: [["need", "rent"], ["want", "game"]] });
    expect(checkAnswer(q, { pairs: { need: "rent", want: "game" } })).toBe(true);
    expect(checkAnswer(q, { pairs: { need: "game", want: "rent" } })).toBe(false);
  });

  it("slider within tolerance", () => {
    const q = row({ ...base, type: "slider", prompt: "p", min: 0, max: 1000, step: 10, unit: "₹", answer: 300, tolerance: 20 });
    expect(checkAnswer(q, { value: 310 })).toBe(true);
    expect(checkAnswer(q, { value: 330 })).toBe(false);
  });

  it("short answer needs meaningful text", () => {
    const q = row({ ...base, type: "short_answer", prompt: "p", checklist: ["x"], minLength: 15 });
    expect(checkAnswer(q, { text: "I would save half of it for a cricket bat" })).toBe(true);
    expect(checkAnswer(q, { text: "aaaaaaaaaaaaaaaaaaaa" })).toBe(false);
  });

  it("rejects the wrong response shape", () => {
    const q = row({ ...base, type: "multiple_choice", prompt: "p", options: ["a", "b"], answer: 0 });
    expect(checkAnswer(q, { value: 0 })).toBe(false);
  });
});

describe("toClient", () => {
  it("never includes the answer", () => {
    const q = row({ ...base, type: "multiple_choice", prompt: "p", options: ["a", "b"], answer: 1 });
    expect(JSON.stringify(toClient(q))).not.toContain("answer");
  });

  it("never hands over an order question already solved", () => {
    const q = row({ ...base, type: "order", prompt: "p", items: ["1", "2", "3"] });
    for (let i = 0; i < 20; i++) {
      const c = toClient(q);
      expect(c.type === "order" && c.items.join()).not.toBe("1,2,3");
    }
  });
});

describe("fromRow", () => {
  it("round-trips every type through the DB format", () => {
    const seeds: QuestionSeed[] = [
      { ...base, type: "multiple_choice", prompt: "p", options: ["a", "b"], answer: 1 },
      { ...base, type: "multi_select", prompt: "p", options: ["a", "b", "c"], answer: [0, 2] },
      { ...base, type: "order", prompt: "p", items: ["1", "2", "3"] },
      { ...base, type: "match_pairs", prompt: "p", pairs: [["a", "1"], ["b", "2"]] },
      { ...base, type: "slider", prompt: "p", min: 0, max: 10, step: 1, unit: "₹", answer: 5, tolerance: 1 },
      { ...base, type: "short_answer", prompt: "p", checklist: ["x"], minLength: 10 },
    ];
    for (const s of seeds) {
      const r = row(s);
      expect(fromRow({ ...r, hint1: "h1", hint2: "h2" })).toEqual(s);
    }
  });
});

describe("isMeaningfulText", () => {
  it("blocks repeats and very short text", () => {
    expect(isMeaningfulText("ok ok ok ok ok ok", 10)).toBe(false);
    expect(isMeaningfulText("hi", 10)).toBe(false);
    expect(isMeaningfulText("Lunch money, bus pass, phone recharge", 10)).toBe(true);
  });
});
