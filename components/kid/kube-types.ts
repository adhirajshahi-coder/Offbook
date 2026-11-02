// Kept out of Kube.tsx ("use client") so server components can import values.

export type KubeExpression =
  | "happy"
  | "thinking"
  | "oops"
  | "celebrate"
  | "sleepy";

export const KUBE_EXPRESSIONS: KubeExpression[] = [
  "happy",
  "thinking",
  "oops",
  "celebrate",
  "sleepy",
];

/**
 * Kube evolves as the student ranks up (PRD §4.5, §7.8).
 * 0 Rookie: plain cube · 1 Explorer: antenna · 2 Builder: cape ·
 * 3 Maker: goggles · 4 Pioneer: star badge · 5 Founder: glow ·
 * 6 Legend: crown.
 */
export type KubeStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
