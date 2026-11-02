import type { VisualKey } from "@/supabase/seed-data/lesson-types";

/**
 * Simple line illustrations for study cards (PRD §9.2: SVG, no emoji).
 * Stroke uses currentColor; the accent fill follows the band theme.
 */

const S = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const A = { fill: "var(--accent)", opacity: 0.18 } as const;

const ICONS: Record<VisualKey, React.ReactNode> = {
  coins: (<><ellipse cx="24" cy="30" rx="13" ry="5" {...A} /><ellipse cx="24" cy="30" rx="13" ry="5" {...S} /><path d="M11 30v-6c0 2.8 5.8 5 13 5s13-2.2 13-5v6" {...S} /><ellipse cx="24" cy="18" rx="13" ry="5" {...S} /><path d="M11 18v6M37 18v6" {...S} /></>),
  wallet: (<><rect x="7" y="14" width="34" height="24" rx="4" {...A} /><rect x="7" y="14" width="34" height="24" rx="4" {...S} /><path d="M7 20h34M31 28h4" {...S} /><path d="M12 14l18-6 2 6" {...S} /></>),
  piggy: (<><ellipse cx="24" cy="26" rx="15" ry="11" {...A} /><ellipse cx="24" cy="26" rx="15" ry="11" {...S} /><path d="M20 15h8M16 36v4M31 36v4M39 24l4-2M31 22h.01" {...S} /></>),
  "chart-up": (<><path d="M8 40h32" {...S} /><rect x="11" y="28" width="6" height="12" {...A} /><rect x="21" y="20" width="6" height="20" {...A} /><rect x="31" y="12" width="6" height="28" {...A} /><path d="M10 26l10-8 8 4 12-12M34 10h6v6" {...S} /></>),
  "chart-down": (<><path d="M8 40h32" {...S} /><path d="M10 12l10 10 8-4 12 14M34 32h6v-6" {...S} /></>),
  calendar: (<><rect x="8" y="11" width="32" height="29" rx="4" {...A} /><rect x="8" y="11" width="32" height="29" rx="4" {...S} /><path d="M8 19h32M16 7v8M32 7v8M15 26h4M23 26h4M31 26h2M15 33h4" {...S} /></>),
  phone: (<><rect x="14" y="6" width="20" height="36" rx="4" {...A} /><rect x="14" y="6" width="20" height="36" rx="4" {...S} /><path d="M21 36h6" {...S} /></>),
  shop: (<><path d="M8 18l3-10h26l3 10" {...S} /><rect x="10" y="18" width="28" height="22" {...A} /><path d="M10 18v22h28V18M8 18h32M20 40V28h8v12" {...S} /></>),
  scale: (<><path d="M24 8v32M14 40h20M10 14h28" {...S} /><path d="M10 14l-5 12h10zM38 14l-5 12h10z" {...A} /><path d="M10 14l-5 12h10zM38 14l-5 12h10z" {...S} /></>),
  shield: (<><path d="M24 6l15 6v10c0 9-6.5 16-15 20-8.5-4-15-11-15-20V12z" {...A} /><path d="M24 6l15 6v10c0 9-6.5 16-15 20-8.5-4-15-11-15-20V12z" {...S} /><path d="M18 24l5 5 8-9" {...S} /></>),
  warning: (<><path d="M24 7l18 32H6z" {...A} /><path d="M24 7l18 32H6z" {...S} /><path d="M24 19v9M24 33h.01" {...S} /></>),
  lightbulb: (<><path d="M17 28a11 11 0 1 1 14 0c-2 2-3 4-3 6H20c0-2-1-4-3-6z" {...A} /><path d="M17 28a11 11 0 1 1 14 0c-2 2-3 4-3 6H20c0-2-1-4-3-6zM20 39h8M22 43h4" {...S} /></>),
  question: (<><circle cx="24" cy="24" r="17" {...A} /><circle cx="24" cy="24" r="17" {...S} /><path d="M19 19a5 5 0 1 1 7 4.6c-1.3.6-2 1.6-2 3V28M24 33h.01" {...S} /></>),
  target: (<><circle cx="24" cy="24" r="17" {...S} /><circle cx="24" cy="24" r="10" {...A} /><circle cx="24" cy="24" r="10" {...S} /><circle cx="24" cy="24" r="3" {...S} /></>),
  list: (<><rect x="9" y="7" width="30" height="34" rx="4" {...A} /><rect x="9" y="7" width="30" height="34" rx="4" {...S} /><path d="M16 17h16M16 24h16M16 31h10" {...S} /></>),
  chat: (<><path d="M8 12h32v20H22l-8 7v-7H8z" {...A} /><path d="M8 12h32v20H22l-8 7v-7H8z" {...S} /><path d="M15 20h18M15 26h12" {...S} /></>),
  megaphone: (<><path d="M10 20h6l18-9v26l-18-9h-6z" {...A} /><path d="M10 20h6l18-9v26l-18-9h-6zM16 28l3 10M39 20v8" {...S} /></>),
  magnifier: (<><circle cx="21" cy="21" r="12" {...A} /><circle cx="21" cy="21" r="12" {...S} /><path d="M30 30l10 10" {...S} /></>),
  handshake: (<><path d="M6 22l8-8 8 4 4-2 8 2 8 6-12 12-8-6" {...A} /><path d="M6 22l8-8 8 4M42 24l-8-8-10 4-6 6 4 3 6-4 8 7M18 30l4 4M14 26l4 4" {...S} /></>),
  brain: (<><path d="M24 10c-4-4-12-2-12 5-5 2-5 9 0 11-1 6 5 10 12 7 7 3 13-1 12-7 5-2 5-9 0-11 0-7-8-9-12-5z" {...A} /><path d="M24 10c-4-4-12-2-12 5-5 2-5 9 0 11-1 6 5 10 12 7 7 3 13-1 12-7 5-2 5-9 0-11 0-7-8-9-12-5zM24 10v26" {...S} /></>),
  check: (<><circle cx="24" cy="24" r="17" {...A} /><circle cx="24" cy="24" r="17" {...S} /><path d="M16 24l6 6 11-12" {...S} /></>),
  cross: (<><circle cx="24" cy="24" r="17" {...A} /><circle cx="24" cy="24" r="17" {...S} /><path d="M18 18l12 12M30 18L18 30" {...S} /></>),
  clock: (<><circle cx="24" cy="24" r="17" {...A} /><circle cx="24" cy="24" r="17" {...S} /><path d="M24 14v10l7 4" {...S} /></>),
  rupee: (<><circle cx="24" cy="24" r="17" {...A} /><circle cx="24" cy="24" r="17" {...S} /><path d="M17 15h14M17 21h14M20 15c8 0 8 12 0 12h-3l10 9" {...S} /></>),
  bank: (<><path d="M6 18L24 8l18 10z" {...A} /><path d="M6 18L24 8l18 10zM10 22v12M18 22v12M30 22v12M38 22v12M6 40h36M8 36h32" {...S} /></>),
  gift: (<><rect x="9" y="18" width="30" height="22" rx="2" {...A} /><path d="M9 18h30v22H9zM7 12h34v6H7zM24 12v28M24 12c-3-6-11-6-9 0M24 12c3-6 11-6 9 0" {...S} /></>),
  people: (<><circle cx="17" cy="16" r="6" {...A} /><circle cx="17" cy="16" r="6" {...S} /><circle cx="33" cy="18" r="5" {...S} /><path d="M6 38c1-7 6-11 11-11s10 4 11 11M28 38c1-5 4-8 7-8s6 3 7 8" {...S} /></>),
  arrows: (<><path d="M8 18h28l-6-6M40 30H12l6 6" {...S} /></>),
  news: (<><rect x="7" y="9" width="34" height="30" rx="3" {...A} /><rect x="7" y="9" width="34" height="30" rx="3" {...S} /><path d="M13 17h22M13 24h10M13 31h10M27 24h8v7h-8z" {...S} /></>),
  heart: (<><path d="M24 40S7 30 7 18a8 8 0 0 1 17-3 8 8 0 0 1 17 3c0 12-17 22-17 22z" {...A} /><path d="M24 40S7 30 7 18a8 8 0 0 1 17-3 8 8 0 0 1 17 3c0 12-17 22-17 22z" {...S} /></>),
};

export function Visual({ name, className }: { name: string; className?: string }) {
  const icon = ICONS[name as VisualKey] ?? ICONS.lightbulb;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {icon}
    </svg>
  );
}
