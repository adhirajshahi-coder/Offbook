/**
 * Theme band vs content level (docs/curriculum-mapping.md §3).
 * - Theme band (look and feel) always comes from the student's class.
 * - Content level (which courses are on the path) starts from class at
 *   signup and then moves with progress, never below a class floor.
 */

export type Band = "explore" | "build" | "launch";
export type ContentLevel = 1 | 2 | 3;

export const MIN_CLASS = 6;
export const MAX_CLASS = 12;

/** Lowest class allowed to study each content level. */
export const LEVEL_CLASS_FLOOR: Record<ContentLevel, number> = {
  1: 6,
  2: 8,
  3: 10,
};

export function assertClassGrade(classGrade: number): void {
  if (
    !Number.isInteger(classGrade) ||
    classGrade < MIN_CLASS ||
    classGrade > MAX_CLASS
  ) {
    throw new RangeError(`Class must be a whole number from 6 to 12, got ${classGrade}`);
  }
}

export function bandForClass(classGrade: number): Band {
  assertClassGrade(classGrade);
  if (classGrade <= 8) return "explore";
  if (classGrade <= 10) return "build";
  return "launch";
}

/** Where a new student starts. Matches the PRD's bands exactly. */
export function placementLevel(classGrade: number): ContentLevel {
  const band = bandForClass(classGrade);
  return band === "explore" ? 1 : band === "build" ? 2 : 3;
}

/** Students placed above Level 1 take the Bridge course first. */
export function needsBridge(startLevel: ContentLevel): boolean {
  return startLevel > 1;
}

/**
 * Whether a student who has finished their current level's path may move up.
 * Early moves are allowed once the student reaches the next level's class floor.
 */
export function canMoveUp(
  currentLevel: ContentLevel,
  classGrade: number,
  levelPathComplete: boolean,
): boolean {
  assertClassGrade(classGrade);
  if (currentLevel === 3 || !levelPathComplete) return false;
  const next = (currentLevel + 1) as ContentLevel;
  return classGrade >= LEVEL_CLASS_FLOOR[next];
}

export const BAND_LABEL: Record<Band, string> = {
  explore: "Explore",
  build: "Build",
  launch: "Launch",
};
