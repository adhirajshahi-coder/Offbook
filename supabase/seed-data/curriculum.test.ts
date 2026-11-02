import { describe, expect, it } from "vitest";
import { COURSES, GAMES, SLOTS, TRACKS } from "./curriculum";

describe("approved curriculum map", () => {
  it("has all 42 courses: 13 / 17 / 12 by level", () => {
    expect(COURSES).toHaveLength(42);
    const byLevel = [1, 2, 3].map((l) => COURSES.filter((c) => c.level === l).length);
    expect(byLevel).toEqual([13, 17, 12]);
  });

  it("matches the curriculum's priority counts", () => {
    const count = (p: string) => COURSES.filter((c) => c.priority === p).length;
    expect([count("core"), count("recommended"), count("elective")]).toEqual([13, 21, 8]);
  });

  it("puts every course on the path or in exactly one slot", () => {
    for (const c of COURSES) {
      expect(Boolean(c.order) !== Boolean(c.slot), c.slug).toBe(true);
    }
  });

  it("has unique path positions per level, with no gaps", () => {
    for (const level of [1, 2, 3] as const) {
      const fixed = COURSES.filter((c) => c.level === level && c.order).map((c) => c.order!);
      const slots = SLOTS.filter((s) => s.level === level).map((s) => s.order);
      const steps = [...fixed, ...slots].sort((a, b) => a - b);
      expect(steps).toEqual(steps.map((_, i) => i + 1));
    }
  });

  it("uses only known tracks, slots and unlock courses", () => {
    const tracks = new Set(TRACKS.map((t) => t.slug));
    const slots = new Set(SLOTS.map((s) => s.key));
    const slugs = new Set(COURSES.map((c) => c.slug));
    for (const c of COURSES) {
      expect(tracks.has(c.track), c.slug).toBe(true);
      if (c.slot) expect(slots.has(c.slot), c.slug).toBe(true);
    }
    for (const g of GAMES) expect(slugs.has(g.unlocksAt), g.slug).toBe(true);
    expect(slugs.size).toBe(COURSES.length);
  });

  it("starts Level 1 with Money Mint and ends Level 3 with the Capstone", () => {
    expect(COURSES.find((c) => c.level === 1 && c.order === 1)?.slug).toBe("money-skills");
    const l3Last = Math.max(...COURSES.filter((c) => c.level === 3 && c.order).map((c) => c.order!));
    expect(COURSES.find((c) => c.level === 3 && c.order === l3Last)?.slug).toBe("capstone");
  });
});
