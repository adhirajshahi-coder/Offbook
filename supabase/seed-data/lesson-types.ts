/**
 * Shape of course content written as seed data (PRD §9.2, §9.3). The seed
 * script turns this into missions, lessons, lesson_steps, questions, skills
 * and skill_links. After seeding, HQ is the source of truth.
 *
 * Each lesson becomes these steps, in order (Watch → Try → Twist → Make):
 *   1. study_deck  (deck)          5–8 cards
 *   2. practice    (practice)      3 question groups
 *   3. study_deck  (twistDeck)     2–3 cards, labelled "Twist"
 *   4. practice    (twistPractice) 2 harder question groups
 *   5. make        (make)
 *   6. reflect     (reflect)
 */

/** Built-in illustration keys rendered by components/kid/Visual.tsx. */
export const VISUAL_KEYS = [
  "coins", "wallet", "piggy", "chart-up", "chart-down", "calendar", "phone", "shop",
  "scale", "shield", "warning", "lightbulb", "question", "target", "list", "chat",
  "megaphone", "magnifier", "handshake", "brain", "check", "cross", "clock", "rupee",
  "bank", "gift", "people", "arrows", "news", "heart",
] as const;
export type VisualKey = (typeof VISUAL_KEYS)[number];

export type Card = {
  /** Under 8 words. */
  title: string;
  /** 1 to 3 short sentences. */
  body: string;
  visual: VisualKey;
};

type QuestionBase = {
  prompt: string;
  /** Shown after any answer: the "here is why". */
  explanation: string;
  /** Nudge. */
  hint1: string;
  /** Partial answer. */
  hint2: string;
  difficulty: 1 | 2 | 3;
};

export type QuestionSeed =
  | (QuestionBase & { type: "multiple_choice" | "scenario"; options: string[]; answer: number })
  | (QuestionBase & { type: "multi_select"; options: string[]; answer: number[] })
  /** `items` in the correct order; the player shuffles them. */
  | (QuestionBase & { type: "order"; items: string[] })
  /** Each pair is [left, right]; the player matches them. */
  | (QuestionBase & { type: "match_pairs"; pairs: [string, string][] })
  | (QuestionBase & { type: "slider"; min: number; max: number; step: number; unit: "₹" | "%" | ""; answer: number; tolerance: number })
  /** Self-checked: any answer of minLength passes; the checklist guides it. */
  | (QuestionBase & { type: "short_answer"; checklist: string[]; minLength: number });

/** One idea tested in 2–3 interchangeable variants (fresh variant after a mistake). */
export type QuestionGroup = {
  /** Unique across all content, e.g. "mm-1-1-a". */
  key: string;
  /** A skill slug from the course's `skills`. */
  skill: string;
  variants: QuestionSeed[];
};

export type LessonSeed = {
  title: string;
  summary: string;
  estMinutes: number;
  skills: string[];
  deck: Card[];
  twistDeck: Card[];
  practice: QuestionGroup[];
  twistPractice: QuestionGroup[];
  make: { prompt: string; rubric: string[] };
  reflect: string;
};

export type BossSeed = {
  title: string;
  intro: string;
  /** 0–100; pass at or above. */
  passPct: number;
  questions: QuestionSeed[];
};

export type MissionSeed = {
  title: string;
  output: string;
  lessons: LessonSeed[];
  boss: BossSeed;
};

export type CourseContentSeed = {
  courseSlug: string;
  skills: { slug: string; name: string; description: string }[];
  skillLinks: { from: string; to: string; type: "prerequisite" | "related" | "applies_in" }[];
  missions: MissionSeed[];
  /** Outlined, not yet written: shown as "coming soon". */
  skeletonMissions: { title: string; output: string; lessonTitles: string[] }[];
};
