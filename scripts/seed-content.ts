/**
 * Loads written course content (supabase/seed-data/content) into missions,
 * lessons, steps, questions, skills and links. Idempotent: rows are matched
 * on natural keys (course+order, mission+order, lesson+order, seed_key) and
 * updated in place, so re-seeding never wipes student progress.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toRow } from "../lib/questions";
import { CRITICAL_THINKING } from "../supabase/seed-data/content/critical-thinking";
import { MONEY_MINT } from "../supabase/seed-data/content/money-mint";
import type { CourseContentSeed, LessonSeed, QuestionSeed } from "../supabase/seed-data/lesson-types";

const CONTENT: CourseContentSeed[] = [MONEY_MINT, CRITICAL_THINKING];

/**
 * Skills from the first lessons of other Level 1 courses, so the map has 25
 * skills and cross-track links before those courses are written (PRD §9.3).
 */
const EXTRA_SKILLS = [
  { slug: "study-techniques", track: "thinking", name: "Study techniques", description: "Use proven ways to learn faster, like spacing and testing yourself." },
  { slug: "online-safety", track: "digital", name: "Online safety", description: "Protect your accounts, passwords and personal details online." },
  { slug: "how-the-internet-works", track: "digital", name: "How the internet works", description: "Follow what happens between a click and a page loading." },
  { slug: "ai-basics", track: "ai-data", name: "AI basics", description: "Understand how AI learns from examples, and where it goes wrong." },
  { slug: "algorithms", track: "coding", name: "Algorithms", description: "Break a task into clear steps a computer can follow." },
  { slug: "data-sense", track: "math", name: "Data sense", description: "Read charts and numbers carefully, and spot misleading ones." },
  { slug: "evidence", track: "science", name: "Using evidence", description: "Test ideas with fair experiments and honest evidence." },
];

const CROSS_LINKS: { from: string; to: string; type: "prerequisite" | "related" | "applies_in" }[] = [
  { from: "scam-awareness", to: "online-safety", type: "related" },
  { from: "digital-ethics", to: "online-safety", type: "related" },
  { from: "digital-ethics", to: "ai-basics", type: "related" },
  { from: "source-checking", to: "evidence", type: "applies_in" },
  { from: "correlation-causation", to: "data-sense", type: "applies_in" },
  { from: "compound-interest", to: "data-sense", type: "applies_in" },
  { from: "misinformation", to: "scam-awareness", type: "related" },
  { from: "budgeting", to: "study-techniques", type: "related" },
  { from: "how-the-internet-works", to: "online-safety", type: "prerequisite" },
  { from: "algorithms", to: "ai-basics", type: "prerequisite" },
];

const BADGES = [
  { slug: "first-steps", name: "First steps", description: "Finished your first lesson.", rule: { metric: "lessons_completed", gte: 1 } },
  { slug: "bounce-back", name: "Bounce back", description: "Got it right after a mistake, three times over.", rule: { metric: "bounce_backs", gte: 3 } },
  { slug: "finisher", name: "Finisher", description: "Completed a whole mission.", rule: { metric: "missions_completed", gte: 1 } },
  { slug: "warm-up-regular", name: "Warm-up regular", description: "Did five daily warm-ups.", rule: { metric: "warmups", gte: 5 } },
];

function must<T>(label: string, r: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data as NonNullable<T>;
}

export async function seedContent(db: SupabaseClient) {
  const { data: tracks } = await db.from("tracks").select("id, slug");
  const trackId = new Map((tracks ?? []).map((t) => [t.slug, t.id as string]));
  const { data: courses } = await db.from("courses").select("id, slug, track_id");
  const course = new Map((courses ?? []).map((c) => [c.slug, c as { id: string; track_id: string }]));

  // Skills
  const skillRows = [
    ...CONTENT.flatMap((c) =>
      c.skills.map((s) => ({ slug: s.slug, name: s.name, description: s.description, track_id: course.get(c.courseSlug)!.track_id })),
    ),
    ...EXTRA_SKILLS.map((s) => ({ slug: s.slug, name: s.name, description: s.description, track_id: trackId.get(s.track)! })),
  ];
  const skills = must("skills", await db.from("skills").upsert(skillRows, { onConflict: "slug" }).select("id, slug"));
  const skillId = new Map(skills.map((s) => [s.slug, s.id as string]));

  const links = [...CONTENT.flatMap((c) => c.skillLinks), ...CROSS_LINKS].map((l) => ({
    from_skill_id: skillId.get(l.from)!,
    to_skill_id: skillId.get(l.to)!,
    link_type: l.type,
  }));
  must("skill links", await db.from("skill_links").upsert(links, { onConflict: "from_skill_id,to_skill_id,link_type", ignoreDuplicates: true }));

  must("badges", await db.from("badges").upsert(BADGES, { onConflict: "slug" }));

  let lessonCount = 0;
  let questionCount = 0;

  for (const content of CONTENT) {
    const c = course.get(content.courseSlug);
    if (!c) throw new Error(`Unknown course ${content.courseSlug}`);

    const missionRows = [
      ...content.missions.map((m, i) => ({
        course_id: c.id,
        order_index: i + 1,
        title: m.title,
        output_description: m.output,
        boss_config: { title: m.boss.title, intro: m.boss.intro, passPct: m.boss.passPct },
        status: "published",
      })),
      ...content.skeletonMissions.map((m, i) => ({
        course_id: c.id,
        order_index: content.missions.length + i + 1,
        title: m.title,
        output_description: m.output,
        boss_config: {},
        status: "draft",
      })),
    ];
    const missions = must(
      "missions",
      await db.from("missions").upsert(missionRows, { onConflict: "course_id,order_index" }).select("id, order_index"),
    );

    for (const [mi, m] of content.missions.entries()) {
      const missionId = missions.find((x) => x.order_index === mi + 1)!.id as string;

      // Boss questions belong to the mission, not a lesson.
      const bossRows = m.boss.questions.map((q, qi) =>
        questionRow(q, { seed_key: `boss:${content.courseSlug}:${mi + 1}#${qi}`, mission_id: missionId, lesson_id: null, variant_group: `boss:${content.courseSlug}:${mi + 1}:${qi}`, skill_id: null }),
      );
      must("boss questions", await db.from("questions").upsert(bossRows, { onConflict: "seed_key" }));
      questionCount += bossRows.length;

      for (const [li, lesson] of m.lessons.entries()) {
        const l = must(
          "lesson",
          await db
            .from("lessons")
            .upsert(
              { mission_id: missionId, order_index: li + 1, title: lesson.title, summary: lesson.summary, est_minutes: lesson.estMinutes, status: "published" },
              { onConflict: "mission_id,order_index" },
            )
            .select("id")
            .single(),
        ) as { id: string };
        lessonCount++;

        must("steps", await db.from("lesson_steps").upsert(stepRows(l.id, lesson), { onConflict: "lesson_id,order_index" }));

        const qRows = [...lesson.practice, ...lesson.twistPractice].flatMap((g) =>
          g.variants.map((v, vi) =>
            questionRow(v, { seed_key: `${g.key}#${vi}`, lesson_id: l.id, mission_id: null, variant_group: g.key, skill_id: skillId.get(g.skill) ?? null }),
          ),
        );
        must("questions", await db.from("questions").upsert(qRows, { onConflict: "seed_key" }));
        questionCount += qRows.length;

        must(
          "lesson skills",
          await db
            .from("lesson_skills")
            .upsert(lesson.skills.map((s) => ({ lesson_id: l.id, skill_id: skillId.get(s)! })), { onConflict: "lesson_id,skill_id", ignoreDuplicates: true }),
        );
      }
    }
  }

  console.log(`✓ ${skills.length} skills, ${links.length} skill links, ${BADGES.length} badges, ${lessonCount} lessons, ${questionCount} questions`);
}

function stepRows(lessonId: string, l: LessonSeed) {
  const practiceGroups = l.practice.map((g) => g.key);
  const twistGroups = l.twistPractice.map((g) => g.key);
  return [
    { type: "study_deck", content: { type: "study_deck", label: "Study", cards: l.deck } },
    { type: "practice", content: { type: "practice", label: "Try", groups: practiceGroups, mode: "mastery" } },
    { type: "study_deck", content: { type: "study_deck", label: "Twist", cards: l.twistDeck } },
    { type: "practice", content: { type: "practice", label: "Twist: try again", groups: twistGroups, mode: "mastery" } },
    { type: "make", content: { type: "make", prompt: l.make.prompt, output: "text", rubric: l.make.rubric } },
    { type: "reflect", content: { type: "reflect", prompt: l.reflect } },
  ].map((s, i) => ({ lesson_id: lessonId, order_index: i + 1, ...s }));
}

function questionRow(
  q: QuestionSeed,
  extra: { seed_key: string; lesson_id: string | null; mission_id: string | null; variant_group: string; skill_id: string | null },
) {
  return {
    ...toRow(q),
    ...extra,
    explanation: q.explanation,
    hint1: q.hint1,
    hint2: q.hint2,
    difficulty: q.difficulty,
    status: "published",
  };
}
