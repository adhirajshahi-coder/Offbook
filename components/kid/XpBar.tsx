import { levelForXp } from "@/lib/gamification/xp";

export function XpBar({ xp, className }: { xp: number; className?: string }) {
  const info = levelForXp(xp);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-display text-base font-black">Lv {info.level}</span>
        <span className="text-muted">
          {info.needed ? `${info.intoLevel} / ${info.needed} XP` : "Max level"}
        </span>
      </div>
      <div
        className="mt-1 h-3 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label={`Level ${info.level} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={info.pct}
      >
        <div className="h-full rounded-full bg-sun transition-[width] duration-500" style={{ width: `${info.pct}%` }} />
      </div>
    </div>
  );
}
