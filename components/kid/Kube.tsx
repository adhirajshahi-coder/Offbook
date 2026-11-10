"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useCalm } from "./Wellbeing";
import type { KubeExpression, KubeStage } from "./kube-types";

const VIOLET = "#7B14FF";
const VIOLET_DEEP = "#5B0FD0";
const VIOLET_LIGHT = "#A66BFF";
const INK = "#121214";
const SUN = "#FFD23F";
const CORAL = "#FF5C7A";

/** Locker body colours (top, left, right faces). Assets match locker_items.asset. */
const KUBE_COLORS: Record<string, [string, string, string]> = {
  violet: [VIOLET, VIOLET_DEEP, "#3A0A8C"],
  mint: ["#1FD6A0", "#12A87C", "#0B7A57"],
  sky: ["#38BDF8", "#1C8FD0", "#13649A"],
  sunset: ["#FF8A5C", "#E8584F", "#B0324A"],
  midnight: ["#3B3F6B", "#262948", "#16182E"],
};

/** Locker accessories, drawn over the body. Assets match locker_items.asset. */
function Accessory({ asset }: { asset: string }) {
  switch (asset) {
    case "cap":
      return (
        <g>
          <path d="M30 26 Q60 -4 90 26 Z" fill={CORAL} />
          <path d="M84 24 Q104 22 112 30 L86 30 Z" fill={CORAL} />
        </g>
      );
    case "shades":
      return (
        <g>
          <rect x="34" y="68" width="22" height="14" rx="5" fill={INK} />
          <rect x="64" y="68" width="22" height="14" rx="5" fill={INK} />
          <path d="M56 74 H64" stroke={INK} strokeWidth="3" />
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M14 60 Q14 6 60 6 Q106 6 106 60" stroke={INK} strokeWidth="6" fill="none" />
          <rect x="4" y="54" width="16" height="26" rx="6" fill={SUN} />
          <rect x="100" y="54" width="16" height="26" rx="6" fill={SUN} />
        </g>
      );
    case "bowtie":
      return <path d="M46 108 L58 114 L46 120 Z M74 108 L62 114 L74 120 Z M56 112 h8 v4 h-8z" fill={CORAL} />;
    case "flower":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={98 + 7 * Math.cos((a * Math.PI) / 180)} cy={28 + 7 * Math.sin((a * Math.PI) / 180)} r="5" fill="#FFB020" />
          ))}
          <circle cx="98" cy="28" r="4" fill="#E06A00" />
        </g>
      );
    case "scarf":
      return (
        <g>
          <path d="M14 100 Q60 124 106 100 L106 110 Q60 134 14 110 Z" fill={CORAL} />
          <path d="M80 112 L86 134 L96 132 L90 108 Z" fill={CORAL} />
        </g>
      );
    default:
      return null;
  }
}

function Face({ expression }: { expression: KubeExpression }) {
  const eye = { fill: "#fff" };
  switch (expression) {
    case "happy":
      return (
        <g>
          <circle cx="46" cy="76" r="7" {...eye} />
          <circle cx="74" cy="76" r="7" {...eye} />
          <circle cx="47" cy="77" r="3.5" fill={INK} />
          <circle cx="75" cy="77" r="3.5" fill={INK} />
          <path d="M48 92 Q60 102 72 92" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "thinking":
      return (
        <g>
          <circle cx="46" cy="76" r="7" {...eye} />
          <circle cx="74" cy="76" r="7" {...eye} />
          <circle cx="49" cy="73" r="3.5" fill={INK} />
          <circle cx="77" cy="73" r="3.5" fill={INK} />
          <path d="M54 95 H68" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="104" cy="22" r="3" fill={VIOLET_LIGHT} />
          <circle cx="111" cy="12" r="4.5" fill={VIOLET_LIGHT} />
        </g>
      );
    case "oops":
      return (
        <g>
          <path d="M38 64 L52 67" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M82 64 L68 67" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="46" cy="77" r="6" {...eye} />
          <circle cx="74" cy="77" r="6" {...eye} />
          <circle cx="46" cy="78" r="3" fill={INK} />
          <circle cx="74" cy="78" r="3" fill={INK} />
          <ellipse cx="60" cy="96" rx="5" ry="6" fill="#fff" />
          <path d="M100 58 q4 8 0 12 q-4 -4 0 -12" fill="#9fd8ff" />
        </g>
      );
    case "celebrate":
      return (
        <g>
          <path d="M39 79 Q46 69 53 79" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M67 79 Q74 69 81 79" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M46 89 Q60 108 74 89 Z" fill="#fff" />
          <path d="M8 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill={SUN} />
          <path d="M110 46 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={SUN} />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M39 78 Q46 83 53 78" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M67 78 Q74 83 81 78" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="96" r="3.5" fill="#fff" />
          <text x="98" y="22" fontSize="14" fontWeight="800" fill={VIOLET_LIGHT} fontFamily="system-ui">
            z
          </text>
          <text x="108" y="10" fontSize="10" fontWeight="800" fill={VIOLET_LIGHT} fontFamily="system-ui">
            z
          </text>
        </g>
      );
  }
}

export function Kube({
  expression = "happy",
  stage = 0,
  size = 120,
  animate = true,
  className,
  label,
  accessory,
  color = "violet",
}: {
  expression?: KubeExpression;
  stage?: KubeStage;
  size?: number;
  animate?: boolean;
  className?: string;
  /** Accessible name; defaults to a description of Kube's mood. */
  label?: string;
  /** Locker accessory asset, e.g. "cap". */
  accessory?: string | null;
  /** Locker colour asset, e.g. "mint". */
  color?: string | null;
}) {
  const [top, left, right] = KUBE_COLORS[color ?? "violet"] ?? KUBE_COLORS.violet;
  const reduced = useReducedMotion();
  const calm = useCalm();
  const bob = animate && !reduced && !calm;
  const name = label ?? `Kube looks ${expression === "oops" ? "surprised" : expression}`;

  return (
    <motion.svg
      viewBox="-6 -10 132 144"
      width={size}
      height={(size * 144) / 132}
      {...(label === ""
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": name })}
      className={cn("overflow-visible", className)}
      animate={
        bob
          ? expression === "celebrate"
            ? { y: [0, -12, 0], rotate: [0, -4, 4, 0] }
            : expression === "oops"
              ? { x: [0, -3, 3, 0] }
              : { y: [0, -4, 0] }
          : undefined
      }
      transition={
        bob
          ? expression === "celebrate"
            ? { duration: 0.7, repeat: 2, ease: "easeOut" }
            : expression === "oops"
              ? { duration: 0.35 }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      {stage >= 5 && (
        <ellipse cx="60" cy="66" rx="64" ry="62" fill={VIOLET_LIGHT} opacity="0.25" />
      )}
      {stage >= 2 && (
        <path d="M14 40 Q-2 96 6 128 L60 112 L114 128 Q122 96 106 40 Z" fill={CORAL} />
      )}
      {stage >= 1 && stage < 6 && accessory !== "cap" && accessory !== "headphones" && (
        <g>
          <path d="M60 12 V-2" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="-4" r="5" fill={SUN} />
        </g>
      )}

      {/* Body: the cube from the logo */}
      <polygon points="60,10 108,34 60,58 12,34" fill={top} stroke={top} strokeWidth="4" strokeLinejoin="round" />
      <polygon points="12,34 60,58 60,118 12,94" fill={left} stroke={left} strokeWidth="4" strokeLinejoin="round" />
      <polygon points="60,58 108,34 108,94 60,118" fill={right} stroke={right} strokeWidth="4" strokeLinejoin="round" />

      <Face expression={expression} />

      {stage >= 3 && (
        <g>
          <rect x="34" y="62" width="52" height="8" rx="4" fill={INK} opacity="0.85" />
        </g>
      )}
      {stage >= 4 && (
        <path d="M30 100 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" fill={SUN} />
      )}
      {stage >= 6 && (
        <path d="M40 18 L46 2 L54 12 L60 -2 L66 12 L74 2 L80 18 Z" fill={SUN} stroke="#E0A800" strokeWidth="2" strokeLinejoin="round" />
      )}
      {accessory && <Accessory asset={accessory} />}
    </motion.svg>
  );
}
