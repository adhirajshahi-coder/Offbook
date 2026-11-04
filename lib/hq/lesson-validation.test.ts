import { describe, expect, it } from "vitest";
import { canPublish, lessonChecks, type EditorStep } from "./lesson-validation";

const good: EditorStep[] = [
  { id: "1", type: "study_deck", content: { cards: [{ title: "Hi", body: "Text", visual: "coins" }] } },
  { id: "2", type: "practice", content: { groups: ["g1"] } },
  { id: "3", type: "make", content: { prompt: "Do it", rubric: [] } },
];

const base = { title: "Lesson", summary: "Sum", steps: good, skillCount: 1, liveGroups: new Set(["g1"]), readyVideos: new Set<string>() };

describe("lessonChecks", () => {
  it("passes a complete lesson", () => {
    expect(canPublish(lessonChecks(base))).toBe(true);
  });

  it("needs a Try step with published questions", () => {
    expect(canPublish(lessonChecks({ ...base, steps: good.filter((s) => s.type !== "practice") }))).toBe(false);
    expect(canPublish(lessonChecks({ ...base, liveGroups: new Set() }))).toBe(false);
  });

  it("needs a Make or Reflect step, skills, title and summary", () => {
    expect(canPublish(lessonChecks({ ...base, steps: good.filter((s) => s.type !== "make") }))).toBe(false);
    expect(canPublish(lessonChecks({ ...base, skillCount: 0 }))).toBe(false);
    expect(canPublish(lessonChecks({ ...base, summary: " " }))).toBe(false);
  });

  it("accepts a video instead of a deck, but only a ready one", () => {
    const steps: EditorStep[] = [{ id: "v", type: "video", content: { video_id: "vid" } }, ...good.slice(1)];
    expect(canPublish(lessonChecks({ ...base, steps }))).toBe(false);
    expect(canPublish(lessonChecks({ ...base, steps, readyVideos: new Set(["vid"]) }))).toBe(true);
  });
});
