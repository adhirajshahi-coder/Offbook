import { describe, expect, it } from "vitest";
import { cohortSizes, LEAGUE_MAX, nextTier, outcomeFor, rankStandings } from "./leagues";

describe("leagues", () => {
  it("splits groups into cohorts of 20–30", () => {
    expect(cohortSizes(0)).toEqual([]);
    expect(cohortSizes(7)).toEqual([7]);
    expect(cohortSizes(30)).toEqual([30]);
    expect(cohortSizes(31)).toEqual([16, 15]);
    const big = cohortSizes(95);
    expect(big.reduce((a, b) => a + b, 0)).toBe(95);
    expect(Math.max(...big)).toBeLessThanOrEqual(LEAGUE_MAX);
    expect(Math.min(...big)).toBeGreaterThanOrEqual(20);
  });

  it("promotes the top 5 and demotes the bottom 5", () => {
    expect(outcomeFor(1, 25, "silver")).toBe("promoted");
    expect(outcomeFor(5, 25, "silver")).toBe("promoted");
    expect(outcomeFor(6, 25, "silver")).toBe("stayed");
    expect(outcomeFor(21, 25, "silver")).toBe("demoted");
    expect(outcomeFor(1, 25, "diamond")).toBe("stayed");
    expect(outcomeFor(25, 25, "bronze")).toBe("stayed");
  });

  it("is gentle in small leagues", () => {
    expect(outcomeFor(3, 3, "silver")).toBe("stayed");
    expect(outcomeFor(1, 8, "bronze")).toBe("promoted");
    expect(outcomeFor(3, 8, "bronze")).toBe("stayed");
  });

  it("moves tiers within bounds", () => {
    expect(nextTier("bronze", "promoted")).toBe("silver");
    expect(nextTier("diamond", "promoted")).toBe("diamond");
    expect(nextTier("bronze", "demoted")).toBe("bronze");
    expect(nextTier("gold", null)).toBe("gold");
  });

  it("ranks by XP with stable ties", () => {
    const r = rankStandings([
      { studentId: "b", xp: 10 },
      { studentId: "a", xp: 10 },
      { studentId: "c", xp: 50 },
    ]);
    expect(r.map((x) => [x.studentId, x.rank])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ]);
  });
});
