import { describe, expect, it } from "vitest";
import {
  bandForClass,
  canMoveUp,
  needsBridge,
  placementLevel,
} from "./bands";

describe("bandForClass", () => {
  it.each([
    [6, "explore"],
    [8, "explore"],
    [9, "build"],
    [10, "build"],
    [11, "launch"],
    [12, "launch"],
  ] as const)("class %i is %s", (grade, band) => {
    expect(bandForClass(grade)).toBe(band);
  });

  it.each([5, 13, 7.5, Number.NaN])("rejects class %s", (grade) => {
    expect(() => bandForClass(grade)).toThrow(RangeError);
  });
});

describe("placementLevel", () => {
  it("places joiners by class", () => {
    expect(placementLevel(7)).toBe(1);
    expect(placementLevel(9)).toBe(2);
    expect(placementLevel(12)).toBe(3);
  });

  it("gives late joiners the Bridge", () => {
    expect(needsBridge(placementLevel(6))).toBe(false);
    expect(needsBridge(placementLevel(10))).toBe(true);
  });
});

describe("canMoveUp", () => {
  it("lets a class-8 student who finished Level 1 move to Level 2", () => {
    expect(canMoveUp(1, 8, true)).toBe(true);
  });

  it("holds a class-7 student at Level 1 until class 8", () => {
    expect(canMoveUp(1, 7, true)).toBe(false);
  });

  it("needs the current path complete", () => {
    expect(canMoveUp(2, 10, false)).toBe(false);
  });

  it("lets a class-10 student move to Level 3", () => {
    expect(canMoveUp(2, 10, true)).toBe(true);
    expect(canMoveUp(2, 9, true)).toBe(false);
  });

  it("has nowhere above Level 3", () => {
    expect(canMoveUp(3, 12, true)).toBe(false);
  });
});
