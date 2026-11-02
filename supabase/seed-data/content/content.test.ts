import { describe, expect, it } from "vitest";
import { toRow } from "@/lib/questions";
import { VISUAL_KEYS, type CourseContentSeed, type QuestionSeed } from "../lesson-types";
import { CRITICAL_THINKING } from "./critical-thinking";
import { MONEY_MINT } from "./money-mint";

const COURSES: CourseContentSeed[] = [MONEY_MINT, CRITICAL_THINKING];

function checkQuestion(q: QuestionSeed, where: string) {
  expect(q.prompt.trim(), where).not.toBe("");
  expect(q.explanation.trim(), where).not.toBe("");
  expect(q.hint1.trim() && q.hint2.trim(), where).toBeTruthy();
  switch (q.type) {
    case "multiple_choice":
    case "scenario":
      expect(q.options.length, where).toBeGreaterThanOrEqual(2);
      expect(q.answer, where).toBeGreaterThanOrEqual(0);
      expect(q.answer, where).toBeLessThan(q.options.length);
      expect(new Set(q.options).size, `${where} duplicate options`).toBe(q.options.length);
      break;
    case "multi_select":
      expect(q.answer.length, where).toBeGreaterThan(0);
      for (const a of q.answer) expect(a >= 0 && a < q.options.length, where).toBe(true);
      break;
    case "order":
      expect(q.items.length, where).toBeGreaterThanOrEqual(3);
      expect(new Set(q.items).size, `${where} duplicate items`).toBe(q.items.length);
      break;
    case "match_pairs":
      expect(q.pairs.length, where).toBeGreaterThanOrEqual(2);
      expect(new Set(q.pairs.map((p) => p[0])).size, `${where} duplicate left`).toBe(q.pairs.length);
      expect(new Set(q.pairs.map((p) => p[1])).size, `${where} duplicate right`).toBe(q.pairs.length);
      break;
    case "slider":
      expect(q.min < q.max && q.answer >= q.min && q.answer <= q.max, where).toBe(true);
      expect(q.tolerance >= 0 && q.step > 0, where).toBe(true);
      break;
    case "short_answer":
      expect(q.minLength, where).toBeGreaterThan(0);
      break;
  }
  expect(() => toRow(q), where).not.toThrow();
}

describe.each(COURSES.map((c) => [c.courseSlug, c] as const))("%s content", (_slug, course) => {
  const skillSlugs = new Set(course.skills.map((s) => s.slug));

  it("has two full missions of three lessons and a skeleton", () => {
    expect(course.missions).toHaveLength(2);
    for (const m of course.missions) expect(m.lessons).toHaveLength(3);
    expect(course.skeletonMissions.length).toBeGreaterThanOrEqual(1);
  });

  it("links only known skills", () => {
    for (const l of course.skillLinks) {
      expect(skillSlugs.has(l.from) && skillSlugs.has(l.to), `${l.from}→${l.to}`).toBe(true);
    }
  });

  it("follows the lesson template", () => {
    for (const m of course.missions) {
      for (const l of m.lessons) {
        const where = `${m.title} / ${l.title}`;
        expect(l.deck.length, where).toBeGreaterThanOrEqual(5);
        expect(l.deck.length, where).toBeLessThanOrEqual(8);
        expect(l.twistDeck.length, where).toBeGreaterThanOrEqual(2);
        expect(l.practice.length, where).toBe(3);
        expect(l.twistPractice.length, where).toBe(2);
        for (const card of [...l.deck, ...l.twistDeck]) {
          expect(VISUAL_KEYS as readonly string[], where).toContain(card.visual);
          expect(card.title.split(/\s+/).length, `${where}: "${card.title}"`).toBeLessThanOrEqual(8);
        }
        for (const s of l.skills) expect(skillSlugs.has(s), `${where} skill ${s}`).toBe(true);
        for (const g of [...l.practice, ...l.twistPractice]) {
          expect(l.skills, `${g.key} skill`).toContain(g.skill);
          expect(g.variants.length, g.key).toBeGreaterThanOrEqual(2);
          g.variants.forEach((v, i) => checkQuestion(v, `${g.key}#${i}`));
        }
        expect(l.make.prompt.trim(), where).not.toBe("");
      }
      expect(m.boss.questions.length, m.title).toBeGreaterThanOrEqual(3);
      m.boss.questions.forEach((q, i) => checkQuestion(q, `${m.title} boss #${i}`));
    }
  });
});

it("uses unique group keys across all courses", () => {
  const keys = COURSES.flatMap((c) => c.missions.flatMap((m) => m.lessons.flatMap((l) => [...l.practice, ...l.twistPractice].map((g) => g.key))));
  expect(new Set(keys).size).toBe(keys.length);
});
