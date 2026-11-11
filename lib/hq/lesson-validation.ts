import { CODE_SCHEMAS, isCodeStep, type CodeStepType } from "@/lib/workspaces/schemas";

/**
 * Publish checklist for a lesson (PRD §10.3). Pure, so the editor shows the
 * same checks the server enforces on publish.
 */

export type EditorStep =
  | { id: string | null; type: "study_deck"; content: { label?: string; cards: { title: string; body: string; visual: string }[] } }
  | { id: string | null; type: "practice"; content: { label?: string; groups: string[] } }
  | { id: string | null; type: "video"; content: { label?: string; video_id: string | null; start_sec?: number | null; end_sec?: number | null; min_watch_pct?: number } }
  | { id: string | null; type: "make"; content: { prompt: string; rubric: string[] } }
  | { id: string | null; type: "reflect"; content: { prompt: string } }
  | { id: string | null; type: CodeStepType; content: Record<string, unknown> };

export type Check = { label: string; ok: boolean };

export function lessonChecks(input: {
  title: string;
  summary: string;
  steps: EditorStep[];
  skillCount: number;
  /** Variant groups that have at least one published question. */
  liveGroups: Set<string>;
  /** Video ids that are ready to play. */
  readyVideos: Set<string>;
}): Check[] {
  const practice = input.steps.filter((s) => s.type === "practice") as Extract<EditorStep, { type: "practice" }>[];
  const decks = input.steps.filter((s) => s.type === "study_deck") as Extract<EditorStep, { type: "study_deck" }>[];
  const videos = input.steps.filter((s) => s.type === "video") as Extract<EditorStep, { type: "video" }>[];
  const makes = input.steps.filter((s) => s.type === "make") as Extract<EditorStep, { type: "make" }>[];
  const code = input.steps.filter((s) => isCodeStep(s.type)) as Extract<EditorStep, { type: CodeStepType }>[];

  return [
    { label: "Has a title and a summary", ok: input.title.trim().length > 0 && input.summary.trim().length > 0 },
    { label: "Has at least one Try step (practice or coding)", ok: practice.length > 0 || code.length > 0 },
    {
      label: "Every practice step has questions that are published",
      ok: practice.every((p) => p.content.groups.length > 0 && p.content.groups.every((g) => input.liveGroups.has(g))),
    },
    { label: "Every coding step is set up correctly", ok: code.every((c) => CODE_SCHEMAS[c.type].safeParse(c.content).success) },
    { label: "Has a Make or Reflect step", ok: input.steps.some((s) => s.type === "make" || s.type === "reflect") },
    { label: "Every Make step has a prompt", ok: makes.every((m) => m.content.prompt.trim().length > 0) },
    { label: "Has something to watch or study first", ok: decks.length > 0 || videos.length > 0 },
    {
      label: "Study cards have a title and text",
      ok: decks.every((d) => d.content.cards.length > 0 && d.content.cards.every((c) => c.title.trim() && c.body.trim())),
    },
    { label: "Every video step points to a ready video", ok: videos.every((v) => v.content.video_id && input.readyVideos.has(v.content.video_id)) },
    { label: "Skills are attached (feeds the skill map)", ok: input.skillCount > 0 },
  ];
}

export function canPublish(checks: Check[]): boolean {
  return checks.every((c) => c.ok);
}
