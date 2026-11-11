import { z } from "zod";

/**
 * Block coding puzzles (Computational Thinking): guide Kube through a grid
 * to the goal with move / turn / repeat blocks. The program is a small tree,
 * interpreted here (no eval), so the server can re-run it to verify.
 */

export type Block = { op: "forward" } | { op: "left" } | { op: "right" } | { op: "repeat"; times: number; body: Block[] };

export const programSchema: z.ZodType<Block[]> = z.lazy(() =>
  z
    .array(
      z.union([
        z.object({ op: z.literal("forward") }),
        z.object({ op: z.literal("left") }),
        z.object({ op: z.literal("right") }),
        z.object({ op: z.literal("repeat"), times: z.number().int().min(1).max(20), body: programSchema }),
      ]),
    )
    .max(60),
);

type Dir = 0 | 1 | 2 | 3; // east, south, west, north
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

export type Pos = { x: number; y: number; dir: Dir };
export type RunResult = {
  reached: boolean;
  path: Pos[];
  /** Why it stopped short, if it did. */
  error: "wall" | "edge" | "too_long" | null;
  blocks: number;
};

export function parseGrid(grid: string[]) {
  let start: Pos = { x: 0, y: 0, dir: 0 };
  let goal = { x: 0, y: 0 };
  grid.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "S") start = { x, y, dir: 0 };
      if (ch === "G") goal = { x, y };
    }),
  );
  return { start, goal, width: grid[0]?.length ?? 0, height: grid.length };
}

export function countBlocks(program: Block[]): number {
  return program.reduce((n, b) => n + 1 + (b.op === "repeat" ? countBlocks(b.body) : 0), 0);
}

const MAX_MOVES = 400;

/** Run a program; stops at the goal, at a wall/edge, or after too many moves. */
export function runProgram(grid: string[], program: Block[]): RunResult {
  const { start, goal, width, height } = parseGrid(grid);
  let pos: Pos = { ...start };
  const path: Pos[] = [{ ...pos }];
  let error: RunResult["error"] = null;
  let done = false;

  const exec = (blocks: Block[]) => {
    for (const b of blocks) {
      if (done || error) return;
      if (b.op === "repeat") {
        for (let i = 0; i < b.times && !done && !error; i++) exec(b.body);
        continue;
      }
      if (path.length > MAX_MOVES) {
        error = "too_long";
        return;
      }
      if (b.op === "left") pos = { ...pos, dir: ((pos.dir + 3) % 4) as Dir };
      else if (b.op === "right") pos = { ...pos, dir: ((pos.dir + 1) % 4) as Dir };
      else {
        const x = pos.x + DX[pos.dir];
        const y = pos.y + DY[pos.dir];
        if (x < 0 || y < 0 || x >= width || y >= height) {
          error = "edge";
          return;
        }
        if (grid[y][x] === "#") {
          error = "wall";
          return;
        }
        pos = { ...pos, x, y };
      }
      path.push({ ...pos });
      if (pos.x === goal.x && pos.y === goal.y) done = true;
    }
  };
  exec(program);
  return { reached: done, path, error: done ? null : error, blocks: countBlocks(program) };
}

/** Full check for a puzzle: reaches the goal, within the block limit if there is one. */
export function checkPuzzle(grid: string[], program: Block[], maxBlocks: number | null): { passed: boolean; message: string; result: RunResult } {
  const result = runProgram(grid, program);
  if (!result.reached) {
    const message =
      result.error === "wall" ? "Bonk! Kube hit a wall. Check your turns." : result.error === "edge" ? "Kube walked off the grid. Try fewer steps." : result.error === "too_long" ? "That loop runs too long." : "Kube stopped before the star. Add more moves.";
    return { passed: false, message, result };
  }
  if (maxBlocks !== null && result.blocks > maxBlocks) {
    return { passed: false, message: `Kube made it! Now do it in ${maxBlocks} blocks or fewer. Try a repeat block.`, result };
  }
  return { passed: true, message: "Kube reached the star!", result };
}

/** Compare SQL results: values compared loosely (numbers vs numeric strings), optionally ignoring row order. */
export function sameRows(actual: unknown[][], expected: unknown[][], ordered: boolean): boolean {
  const norm = (rows: unknown[][]) => rows.map((r) => JSON.stringify(r.map((v) => (v === null ? null : typeof v === "number" ? v : Number.isFinite(Number(v)) && String(v).trim() !== "" ? Number(v) : String(v)))));
  const a = norm(actual);
  const e = norm(expected);
  if (a.length !== e.length) return false;
  if (ordered) return a.every((r, i) => r === e[i]);
  return [...a].sort().every((r, i) => r === [...e].sort()[i]);
}
