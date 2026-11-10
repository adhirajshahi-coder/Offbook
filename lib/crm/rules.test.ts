import { describe, expect, it } from "vitest";
import { findDuplicate, forecastByMonth, guessMapping, mapRow, nextBusinessDayEvening, normalizePhone, roundRobin, staleReason } from "./rules";

describe("stale deals", () => {
  const now = new Date("2026-11-10T06:00:00Z");
  it("flags open deals with no next activity or no movement", () => {
    expect(staleReason({ status: "open", stage_changed_at: "2026-11-09T00:00:00Z" }, false, 14, now)).toBe("no_next_activity");
    expect(staleReason({ status: "open", stage_changed_at: "2026-10-20T00:00:00Z" }, true, 14, now)).toBe("no_movement");
    expect(staleReason({ status: "open", stage_changed_at: "2026-11-01T00:00:00Z" }, true, 14, now)).toBeNull();
    expect(staleReason({ status: "won", stage_changed_at: "2026-01-01T00:00:00Z" }, false, 14, now)).toBeNull();
  });
});

describe("forecast", () => {
  it("weights open deals by stage probability per month", () => {
    const f = forecastByMonth([
      { value_paise: 100_000, probability: 50, expected_close: "2026-12-15", status: "open" },
      { value_paise: 200_000, probability: 25, expected_close: "2026-12-01", status: "open" },
      { value_paise: 999_999, probability: 100, expected_close: "2026-12-01", status: "won" },
      { value_paise: 40_000, probability: 10, expected_close: null, status: "open" },
    ]);
    expect(f).toEqual([
      { month: "2026-12", weighted: 100_000, total: 300_000, count: 2 },
      { month: "unscheduled", weighted: 4_000, total: 40_000, count: 1 },
    ]);
  });
});

describe("dedupe", () => {
  it("normalises Indian phone numbers", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("098765-43210")).toBe("9876543210");
    expect(normalizePhone("12")).toBeNull();
  });
  it("matches by email first, then phone", () => {
    const existing = [
      { id: "a", email: "head@school.in", phone: null },
      { id: "b", email: null, phone: "+91 9876543210" },
    ];
    expect(findDuplicate({ email: "HEAD@school.in " }, existing)?.id).toBe("a");
    expect(findDuplicate({ email: "new@x.in", phone: "9876543210" }, existing)?.id).toBe("b");
    expect(findDuplicate({ email: "new@x.in" }, existing)).toBeNull();
  });
});

describe("scheduling and assignment", () => {
  it("due the next business day at 6 pm IST", () => {
    // Friday 2026-11-13 15:00 IST → Monday 16th 18:00 IST
    expect(nextBusinessDayEvening(new Date("2026-11-13T09:30:00Z")).toISOString()).toBe("2026-11-16T12:30:00.000Z");
    // Tuesday → Wednesday
    expect(nextBusinessDayEvening(new Date("2026-11-10T04:00:00Z")).toISOString()).toBe("2026-11-11T12:30:00.000Z");
  });
  it("round robins through owners", () => {
    expect(roundRobin(["x", "y"], 0)).toEqual({ owner: "x", next: 1 });
    expect(roundRobin(["x", "y"], 1)).toEqual({ owner: "y", next: 2 });
    expect(roundRobin(["x", "y"], 2)).toEqual({ owner: "x", next: 1 });
    expect(roundRobin([], 3)).toEqual({ owner: null, next: 3 });
  });
});

describe("CSV import", () => {
  it("guesses a mapping and maps rows", () => {
    const m = guessMapping(["Full name", "Email ID", "Mobile", "School", "City", "Designation", "Notes"]);
    expect(m).toEqual({ "Full name": "name", "Email ID": "email", Mobile: "phone", School: "organization", City: "city", Designation: "title", Notes: "skip" });
    expect(mapRow({ "Full name": " Asha ", "Email ID": "a@b.in", Notes: "x" }, m)).toEqual({ name: "Asha", email: "a@b.in" });
  });
});
