import { loadPyodide } from "pyodide";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { CODING_STARTERS } from "@/supabase/seed-data/content/coding-starters";
import { checkPuzzle, sameRows, type Block } from "./blocks";
import { CODE_SCHEMAS } from "./schemas";

/**
 * Every starter coding step must be solvable, and its checks must actually
 * catch the untouched starter code. Python and SQL run for real here.
 */

const steps = CODING_STARTERS.flatMap((s) => s.lesson.code.map((c, i) => ({ id: `${s.courseSlug}#${i}`, ...c })));

// Reference solutions, kept out of the content sent to browsers.
const BLOCKS: Record<string, Block[]> = {
  "block-coding#0": [{ op: "forward" }, { op: "forward" }, { op: "forward" }],
  "block-coding#1": [{ op: "forward" }, { op: "right" }, { op: "forward" }, { op: "forward" }, { op: "left" }, { op: "forward" }],
  "block-coding#2": [{ op: "repeat", times: 7, body: [{ op: "forward" }] }],
};
const PYTHON: Record<string, string> = {
  "python-1#0": 'print("Hello, Offbook!")',
  "python-1#1": "def total(a, b):\n    return a + b\n",
};
const SQL: Record<string, string> = {
  "databases#0": "SELECT name FROM scores WHERE score > 80",
  "databases#1": "SELECT name, score FROM scores ORDER BY score DESC",
};

describe("starter coding lessons", () => {
  it("all validate against their workspace schema", () => {
    for (const s of steps) expect(CODE_SCHEMAS[s.type].safeParse(s.content).success, s.id).toBe(true);
  });

  it("block puzzles are solvable within their limits (and empty programs fail)", () => {
    for (const s of steps.filter((x) => x.type === "code_blocks")) {
      const c = CODE_SCHEMAS.code_blocks.parse(s.content);
      expect(checkPuzzle(c.grid, BLOCKS[s.id], c.maxBlocks).passed, s.id).toBe(true);
      expect(checkPuzzle(c.grid, [], c.maxBlocks).passed).toBe(false);
    }
  });

  it("SQL expected rows match the reference query, not the starter", async () => {
    const SQLJs = await initSqlJs();
    for (const s of steps.filter((x) => x.type === "sql")) {
      const c = CODE_SCHEMAS.sql.parse(s.content);
      const run = (q: string) => {
        const db = new SQLJs.Database();
        db.exec(c.schema);
        const r = db.exec(q);
        db.close();
        return r[r.length - 1]?.values ?? [];
      };
      expect(sameRows(run(SQL[s.id]), c.expected, c.ordered), s.id).toBe(true);
      expect(sameRows(run(c.starter), c.expected, c.ordered), `${s.id} starter`).toBe(false);
    }
  });

  it("Python checks pass the reference solution and catch the starter", async () => {
    const py = await loadPyodide();
    const runChecks = async (code: string, checks: { code?: string; outputIncludes?: string }[]) => {
      let out = "";
      py.setStdout({ batched: (t: string) => (out += t + "\n") });
      const ns = py.globals.get("dict")();
      try {
        await py.runPythonAsync(code, { globals: ns });
      } catch {
        return false;
      }
      for (const k of checks) {
        if (k.outputIncludes && !out.includes(k.outputIncludes)) return false;
        if (k.code) {
          try {
            await py.runPythonAsync(k.code, { globals: ns });
          } catch {
            return false;
          }
        }
      }
      return true;
    };
    for (const s of steps.filter((x) => x.type === "code_python")) {
      const c = CODE_SCHEMAS.code_python.parse(s.content);
      expect(await runChecks(PYTHON[s.id], c.checks), s.id).toBe(true);
      expect(await runChecks(c.starter, c.checks), `${s.id} starter`).toBe(false);
    }
  }, 120_000);
});
