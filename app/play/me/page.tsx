import type { Metadata } from "next";
import { Kube } from "@/components/kid/Kube";
import type { KubeStage } from "@/components/kid/kube-types";
import { MuteToggle } from "@/components/kid/MuteToggle";
import { WithTabs } from "@/components/kid/TabBar";
import { XpBar } from "@/components/kid/XpBar";
import { RANKS, RANK_LABEL, RANK_THRESHOLDS, rankIndex, type Rank } from "@/lib/gamification/xp";
import { istDay, istWeekStart } from "@/lib/gamification/streaks";
import { requireStudent } from "@/lib/play/session";
import { loadStats } from "@/lib/play/stats";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Me" };

const MASTERY_LABEL = ["Attempted", "Familiar", "Proficient", "Mastered"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function MePage() {
  const student = await requireStudent();
  const stats = await loadStats(student.id, student.weekly_goal);
  const rank = (student.rank as Rank) ?? "rookie";
  const ri = rankIndex(rank);
  const nextRank = RANKS[ri + 1];
  const weekDays = weekDates();
  const mastered = stats.mastery.filter((m) => m.level >= 3);
  const growing = stats.mastery.filter((m) => m.level < 3).sort((a, b) => b.level - a.level);

  return (
    <WithTabs>
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5">
        <section className="flex flex-col items-center gap-3 rounded-band border border-line bg-surface p-6 text-center">
          <Kube stage={ri as KubeStage} expression="happy" size={120} />
          <h1 className="text-3xl font-black">{student.display_name}</h1>
          <p className="font-semibold">{RANK_LABEL[rank]}</p>
          <XpBar xp={student.xp} className="w-full max-w-sm text-left" />
          <p className="text-sm text-muted">
            {nextRank
              ? `Finish ${RANK_THRESHOLDS[nextRank]} ${RANK_THRESHOLDS[nextRank] === 1 ? "course" : "courses"} to become ${RANK_LABEL[nextRank]}. Kube evolves too.`
              : "Top rank. Legendary."}
          </p>
          <MuteToggle />
        </section>

        <section className="rounded-band border border-line bg-surface p-5">
          <h2 className="text-xl font-black">This week</h2>
          <p className="mt-1 text-sm text-muted">
            Goal: learn {stats.streak.goal} days this week. {stats.streak.weeks > 0 ? `${stats.streak.weeks}-week streak.` : ""}
          </p>
          <ol className="mt-3 grid grid-cols-7 gap-2">
            {weekDays.map((d, i) => {
              const active = stats.streak.activeDays.includes(d);
              return (
                <li key={d} className="flex flex-col items-center gap-1 text-xs">
                  <span
                    className={cn("grid h-10 w-10 place-items-center rounded-full font-bold", active ? "bg-mint text-ink" : "bg-surface-2 text-muted")}
                    aria-label={`${DAYS[i]}: ${active ? "learned" : "no activity"}`}
                  >
                    {active ? "✓" : ""}
                  </span>
                  {DAYS[i]}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-band border border-line bg-surface p-5">
          <h2 className="text-xl font-black">Constellation</h2>
          <p className="mt-1 text-sm text-muted">Every skill you master lights up a star.</p>
          {stats.mastery.length === 0 ? (
            <p className="mt-3 text-muted">Finish a lesson to light your first star.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...mastered, ...growing].map((m) => (
                <li
                  key={m.slug}
                  className={cn(
                    "rounded-full border-2 px-3 py-1 text-sm font-semibold",
                    m.level >= 3 ? "border-sun bg-sun text-ink" : "border-line text-muted",
                  )}
                >
                  {m.level >= 3 ? "★ " : "☆ "}
                  {m.name}
                  <span className="sr-only">: {MASTERY_LABEL[m.level]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-band border border-line bg-surface p-5">
          <h2 className="text-xl font-black">Badges</h2>
          {stats.badges.length === 0 ? (
            <p className="mt-2 text-muted">Your first badge is one lesson away.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {stats.badges.map((b) => (
                <li key={b.name} className="rounded-band bg-surface-2 p-3">
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-sm text-muted">{b.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-band border border-dashed border-line p-5">
          <h2 className="text-xl font-black">Portfolio</h2>
          <p className="mt-1 text-sm text-muted">
            Your finished missions and projects will show up here as cards you can be proud of.
          </p>
        </section>
      </main>
    </WithTabs>
  );
}

function weekDates(): string[] {
  const monday = new Date(`${istWeekStart(new Date())}T00:00:00Z`).getTime();
  return Array.from({ length: 7 }, (_, i) => istDay(new Date(monday + i * 86_400_000 - 5.5 * 3_600_000)));
}
