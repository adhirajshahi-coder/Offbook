import { describe, expect, it } from "vitest";
import { checkPuzzle, countBlocks, programSchema, runProgram, sameRows, type Block } from "./blocks";
import { blocksContentSchema, pythonContentSchema, sqlContentSchema, webContentSchema } from "./schemas";

const GRID = ["S..#", ".#..", "...G"];

describe("block puzzles", () => {
  const solution: Block[] = [{ op: "right" }, { op: "repeat", times: 2, body: [{ op: "forward" }] }, { op: "left" }, { op: "repeat", times: 3, body: [{ op: "forward" }] }];

  it("reaches the goal with a correct program", () => {
    const r = runProgram(GRID, solution);
    expect(r.reached).toBe(true);
    expect(r.blocks).toBe(6);
  });

  it("stops at walls and edges with a helpful message", () => {
    expect(checkPuzzle(GRID, [{ op: "forward" }, { op: "forward" }, { op: "forward" }], null).message).toMatch(/wall/);
    expect(runProgram(GRID, [{ op: "left" }, { op: "forward" }]).error).toBe("edge");
    expect(checkPuzzle(GRID, [{ op: "forward" }], null).passed).toBe(false);
  });

  it("enforces the block limit and caps runaway loops", () => {
    const long: Block[] = [{ op: "right" }, { op: "forward" }, { op: "forward" }, { op: "left" }, { op: "forward" }, { op: "forward" }, { op: "forward" }];
    expect(checkPuzzle(GRID, long, 5).passed).toBe(false);
    expect(checkPuzzle(GRID, solution, 6).passed).toBe(true);
    const spin: Block[] = [{ op: "repeat", times: 20, body: [{ op: "repeat", times: 20, body: [{ op: "left" }, { op: "right" }] }] }];
    expect(runProgram(GRID, spin).error).toBe("too_long");
    expect(countBlocks(spin)).toBe(4);
  });

  it("validates programs from the browser", () => {
    expect(programSchema.safeParse(solution).success).toBe(true);
    expect(programSchema.safeParse([{ op: "jump" }]).success).toBe(false);
    expect(programSchema.safeParse([{ op: "repeat", times: 999, body: [] }]).success).toBe(false);
  });
});

describe("sql results", () => {
  it("compares rows loosely, with or without order", () => {
    expect(sameRows([["Asha", 3], ["Ravi", "2"]], [["Ravi", 2], ["Asha", 3]], false)).toBe(true);
    expect(sameRows([["Asha", 3], ["Ravi", 2]], [["Ravi", 2], ["Asha", 3]], true)).toBe(false);
    expect(sameRows([["Asha", 3]], [["Asha", 3], ["Ravi", 2]], false)).toBe(false);
  });
});

describe("content schemas", () => {
  it("rejects broken grids and checks", () => {
    expect(blocksContentSchema.safeParse({ prompt: "Go", grid: ["S..", "..G"] }).success).toBe(true);
    expect(blocksContentSchema.safeParse({ prompt: "Go", grid: ["S..", "..."] }).success).toBe(false);
    expect(blocksContentSchema.safeParse({ prompt: "Go", grid: ["S..", ".G"] }).success).toBe(false);
    expect(pythonContentSchema.safeParse({ prompt: "x", checks: [{ label: "empty" }] }).success).toBe(false);
    expect(webContentSchema.safeParse({ prompt: "x", checks: [{ label: "h1", selector: "h1" }] }).success).toBe(true);
    expect(sqlContentSchema.safeParse({ prompt: "x", schema: "create table t(a);", expected: [[1]] }).success).toBe(true);
  });
});
