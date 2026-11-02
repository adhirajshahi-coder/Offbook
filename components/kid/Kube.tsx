"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { KubeExpression, KubeStage } from "./kube-types";

const VIOLET = "#7B14FF";
const VIOLET_DEEP = "#5B0FD0";
const VIOLET_LIGHT = "#A66BFF";
const INK = "#121214";
const SUN = "#FFD23F";
const CORAL = "#FF5C7A";

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
}: {
  expression?: KubeExpression;
  stage?: KubeStage;
  size?: number;
  animate?: boolean;
  className?: string;
  /** Accessible name; defaults to a description of Kube's mood. */
  label?: string;
}) {
  const reduced = useReducedMotion();
  const bob = animate && !reduced;
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
      {stage >= 1 && stage < 6 && (
        <g>
          <path d="M60 12 V-2" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="-4" r="5" fill={SUN} />
        </g>
      )}

      {/* Body: the cube from the logo */}
      <polygon points="60,10 108,34 60,58 12,34" fill={VIOLET} stroke={VIOLET} strokeWidth="4" strokeLinejoin="round" />
      <polygon points="12,34 60,58 60,118 12,94" fill={VIOLET_DEEP} stroke={VIOLET_DEEP} strokeWidth="4" strokeLinejoin="round" />
      <polygon points="60,58 108,34 108,94 60,118" fill="#3A0A8C" stroke="#3A0A8C" strokeWidth="4" strokeLinejoin="round" />

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
    </motion.svg>
  );
}
