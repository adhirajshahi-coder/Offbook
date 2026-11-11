import { z } from "zod";

/**
 * Interactive coding workspaces (curriculum mapping §7, Phase 7): four lesson
 * step types. Content lives in lesson_steps.content and is edited in HQ.
 * Checks run in the browser; code_blocks is also re-checked on the server.
 */

export const CODE_STEP_TYPES = ["code_blocks", "code_python", "code_web", "sql"] as const;
export type CodeStepType = (typeof CODE_STEP_TYPES)[number];

export function isCodeStep(type: string): type is CodeStepType {
  return (CODE_STEP_TYPES as readonly string[]).includes(type);
}

const base = {
  label: z.string().max(60).optional(),
  prompt: z.string().min(1).max(1000),
  hints: z.array(z.string().min(1).max(300)).max(3).default([]),
  /** Shown after it passes: why it works. */
  explanation: z.string().max(600).default(""),
};

export const BLOCK_OPS = ["forward", "left", "right", "repeat"] as const;

export const blocksContentSchema = z
  .object({
    ...base,
    /** Rows of the grid: S start (facing east), G goal, # wall, . floor. */
    grid: z.array(z.string().regex(/^[SG#.]+$/)).min(1).max(10),
    /** Optional: solve it in at most this many blocks. */
    maxBlocks: z.number().int().min(1).max(50).nullable().default(null),
    allowRepeat: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    const flat = c.grid.join("");
    if ((flat.match(/S/g) ?? []).length !== 1) ctx.addIssue({ code: "custom", message: "The grid needs exactly one S (start)" });
    if ((flat.match(/G/g) ?? []).length !== 1) ctx.addIssue({ code: "custom", message: "The grid needs exactly one G (goal)" });
    if (new Set(c.grid.map((r) => r.length)).size !== 1) ctx.addIssue({ code: "custom", message: "Every grid row must be the same length" });
  });

const pyCheck = z.object({
  label: z.string().min(1).max(120),
  /** Python run after the student's code; it passes if it doesn't raise. e.g. `assert total(2, 3) == 5` */
  code: z.string().max(1000).optional(),
  /** Or: the printed output must contain this text. */
  outputIncludes: z.string().max(300).optional(),
});

export const pythonContentSchema = z
  .object({ ...base, starter: z.string().max(4000).default(""), checks: z.array(pyCheck).min(1).max(8) })
  .superRefine((c, ctx) => {
    c.checks.forEach((k, i) => {
      if (!k.code && !k.outputIncludes) ctx.addIssue({ code: "custom", message: `Check ${i + 1} needs code or outputIncludes`, path: ["checks", i] });
    });
  });

const webCheck = z.object({
  label: z.string().min(1).max(120),
  selector: z.string().min(1).max(200),
  /** Element text must include this (case-insensitive). */
  text: z.string().max(200).optional(),
  /** Or a computed style must match, e.g. property "color", value "rgb(123, 20, 255)". */
  style: z.object({ property: z.string().min(1).max(60), value: z.string().min(1).max(120) }).optional(),
  /** At least this many matching elements (default 1). */
  count: z.number().int().min(1).max(50).optional(),
});

export const webContentSchema = z.object({
  ...base,
  html: z.string().max(6000).default(""),
  css: z.string().max(6000).default(""),
  js: z.string().max(6000).default(""),
  /** Which tabs the student can edit. */
  tabs: z.array(z.enum(["html", "css", "js"])).min(1).default(["html", "css"]),
  checks: z.array(webCheck).min(1).max(8),
});

export const sqlContentSchema = z.object({
  ...base,
  /** CREATE TABLE and INSERT statements that build a fresh database for each run. */
  schema: z.string().min(1).max(8000),
  starter: z.string().max(2000).default(""),
  /** The rows a correct query returns (header row not included). */
  expected: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).min(0).max(200),
  ordered: z.boolean().default(false),
});

export type BlocksContent = z.infer<typeof blocksContentSchema>;
export type PythonContent = z.infer<typeof pythonContentSchema>;
export type WebContent = z.infer<typeof webContentSchema>;
export type SqlContent = z.infer<typeof sqlContentSchema>;

export const CODE_SCHEMAS = {
  code_blocks: blocksContentSchema,
  code_python: pythonContentSchema,
  code_web: webContentSchema,
  sql: sqlContentSchema,
} as const;

export const CODE_STEP_LABEL: Record<CodeStepType, string> = {
  code_blocks: "Block coding",
  code_python: "Python",
  code_web: "Web page",
  sql: "SQL",
};

/** What the browser reports when a code step is attempted. */
export type CodeAttempt = {
  source: string;
  results: { label: string; passed: boolean }[];
  /** code_blocks only: the program, re-run on the server. */
  program?: unknown;
};

export function checkCount(type: CodeStepType, content: unknown): number {
  if (type === "code_blocks") return 1;
  if (type === "sql") return 1;
  return ((content as { checks?: unknown[] }).checks ?? []).length;
}
