import type { Metadata } from "next";
import Link from "next/link";
import { Kube } from "@/components/kid/Kube";
import type { KubeStage } from "@/components/kid/kube-types";
import { MuteToggle } from "@/components/kid/MuteToggle";
import { CalmToggle } from "@/components/kid/Wellbeing";
import { InstallButton } from "@/components/Pwa";
import { WithTabs } from "@/components/kid/TabBar";
import { XpBar } from "@/components/kid/XpBar";
import { RANKS, RANK_LABEL, RANK_THRESHOLDS, rankIndex, type Rank } from "@/lib/gamification/xp";
import { istDay, istWeekStart } from "@/lib/gamification/streaks";
import { requireStudent } from "@/lib/play/session";
import { loadStats } from "@/lib/play/stats";
import { loadLocker } from "@/lib/play/locker";
import { loadPortfolio, SOURCE_LABEL } from "@/lib/portfolio";
import { Locker } from "./Locker";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Me" };

const MASTERY_LABEL = ["Attempted", "Familiar", "Proficient", "Mastered"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function MePage() {
  const student = await requireStudent();
  const [stats, portfolio, locker] = await Promise.all([loadStats(student.id, student.weekly_goal), loadPortfolio(student.id), loadLocker(student)]);
  const wearing = (kind: "accessory" | "color") => locker.items.find((i) => i.kind === kind && i.equipped)?.asset ?? null;
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
          <Kube stage={ri as KubeStage} expression="happy" size={120} accessory={wearing("accessory")} color={wearing("color")} />
          <h1 className="text-3xl font-black">{student.display_name}</h1>
          <p className="font-semibold">{RANK_LABEL[rank]}</p>
          <XpBar xp={student.xp} className="w-full max-w-sm text-left" />
          <p className="text-sm text-muted">
            {nextRank
              ? `Finish ${RANK_THRESHOLDS[nextRank]} ${RANK_THRESHOLDS[nextRank] === 1 ? "course" : "courses"} to become ${RANK_LABEL[nextRank]}. Kube evolves too.`
              : "Top rank. Legendary."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/play/league" className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold">
              🏆 Weekly league
            </Link>
          </div>
        </section>

        <section className="rounded-band border border-line bg-surface p-5">
          <h2 className="text-xl font-black">Settings</h2>
          <p className="mt-1 text-sm text-muted">Sound plays a short note on each answer. Calm motion turns off bouncing and confetti.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MuteToggle />
            <CalmToggle />
            <InstallButton />
          </div>
        </section>

        <Locker items={locker.items} coins={locker.coins} level={student.level} stage={ri as KubeStage} />

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
                    role="img"
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

        <section className="rounded-band border border-line bg-surface p-5">
          <h2 className="text-xl font-black">Portfolio</h2>
          {portfolio.items.length === 0 && portfolio.certificates.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Finish a capstone or a challenge and it becomes a card here you can be proud of.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">Only you and your parent see these, unless your parent chooses to share them.</p>
              {portfolio.certificates.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {portfolio.certificates.map((c) => (
                    <li key={c.code}>
                      <Link href={`/certificates/${c.code}`} className="inline-flex items-center gap-1 rounded-full bg-sun px-3 py-1 text-sm font-bold text-ink">
                        🏅 {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {portfolio.items.map((item) => (
                  <li key={item.id} className="rounded-band border-2 border-line bg-bg p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">{SOURCE_LABEL[item.source_type]}</p>
                    <h3 className="font-black">{item.title}</h3>
                    {item.summary && <p className="mt-1 text-sm text-muted">{item.summary}</p>}
                    {item.skills.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {item.skills.map((sk) => (
                          <li key={sk} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">
                            {sk}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.showcase_status === "approved" && <p className="mt-2 text-xs font-semibold">★ On the Offbook Showcase</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
    </WithTabs>
  );
}

function weekDates(): string[] {
  const monday = new Date(`${istWeekStart(new Date())}T00:00:00Z`).getTime();
  return Array.from({ length: 7 }, (_, i) => istDay(new Date(monday + i * 86_400_000 - 5.5 * 3_600_000)));
}
