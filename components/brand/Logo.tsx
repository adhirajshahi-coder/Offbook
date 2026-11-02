/**
 * Offbook brand marks, traced from public/brand/offbook-logo.png.
 * Rules (PRD §4.1): OFF in ink (white on dark), BOOK in violet. Never
 * recolour, stretch or add effects. Keep clear space equal to the cube height.
 */

type Tone = "light" | "dark";

const VIOLET = "#7B14FF";
const VIOLET_DEEP = "#5B0FD0";
const INK = "#121214";

function CubeShapes({ ink, idPrefix }: { ink: string; idPrefix: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${idPrefix}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={VIOLET} />
          <stop offset="1" stopColor={VIOLET_DEEP} />
        </linearGradient>
      </defs>
      <polygon
        points="182,336 266,296 355,336 266,378"
        fill={`url(#${idPrefix}-top)`}
        strokeLinejoin="round"
        stroke={`url(#${idPrefix}-top)`}
        strokeWidth="6"
      />
      <polygon
        points="165,353 215,378 215,440 262,463 262,512 180,472 165,456"
        fill={VIOLET_DEEP}
      />
      <polygon
        points="370,353 322,378 322,440 277,463 277,512 355,472 370,456"
        fill={ink}
      />
    </>
  );
}

function LetterShapes({ ink, idPrefix }: { ink: string; idPrefix: string }) {
  return (
    <>
      <defs>
        <mask id={`${idPrefix}-holes`} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="800">
          <rect x="0" y="0" width="1600" height="800" fill="white" />
          {/* B counters */}
          <rect x="728" y="366" width="44" height="28" rx="12" fill="black" />
          <rect x="728" y="434" width="56" height="32" rx="14" fill="black" />
          {/* O counters */}
          <circle cx="935" cy="415" r="46" fill="black" />
          <circle cx="1130" cy="415" r="46" fill="black" />
        </mask>
      </defs>
      {/* FF */}
      <g fill={ink}>
        <rect x="395" y="330" width="45" height="175" />
        <rect x="395" y="330" width="115" height="46" />
        <rect x="395" y="400" width="108" height="44" />
        <rect x="540" y="330" width="45" height="175" />
        <rect x="540" y="330" width="115" height="46" />
        <rect x="540" y="400" width="108" height="44" />
      </g>
      {/* BOOK */}
      <g fill={VIOLET} mask={`url(#${idPrefix}-holes)`}>
        <rect x="682" y="326" width="80" height="179" />
        <rect x="690" y="326" width="122" height="98" rx="48" />
        <rect x="690" y="408" width="142" height="97" rx="48" />
        <circle cx="935" cy="415" r="93" />
        <circle cx="1130" cy="415" r="93" />
        <rect x="1240" y="330" width="40" height="175" />
        <polygon points="1278,398 1398,316 1432,352 1278,460" />
        <polygon points="1350,274 1460,248 1442,356" />
        <polygon points="1300,424 1330,398 1415,505 1356,505" />
      </g>
    </>
  );
}

export function Wordmark({
  tone = "light",
  className,
  title = "Offbook",
}: {
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  const ink = tone === "dark" ? "#FFFFFF" : INK;
  const id = `wm-${tone}`;
  return (
    <svg
      viewBox="150 230 1330 300"
      className={className}
      role="img"
      aria-label={title}
    >
      <CubeShapes ink={ink} idPrefix={id} />
      <LetterShapes ink={ink} idPrefix={id} />
    </svg>
  );
}

export function CubeMark({
  tone = "light",
  className,
  title = "Offbook",
}: {
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  const ink = tone === "dark" ? "#FFFFFF" : INK;
  return (
    <svg
      viewBox="150 280 236 246"
      className={className}
      role="img"
      aria-label={title}
    >
      <CubeShapes ink={ink} idPrefix={`cube-${tone}`} />
    </svg>
  );
}

/** The "level up" arrow from the K, as a reusable icon. */
export function LevelUpArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="1270 240 200 230" className={className} aria-hidden="true">
      <g fill="currentColor">
        <polygon points="1278,398 1398,316 1432,352 1278,460" />
        <polygon points="1350,274 1460,248 1442,356" />
      </g>
    </svg>
  );
}
