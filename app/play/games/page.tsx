import type { Metadata } from "next";
import Link from "next/link";
import { WithTabs } from "@/components/kid/TabBar";
import { GAME_DAILY_CAP } from "@/lib/games/xp";
import { gameXpToday, loadGames } from "@/lib/play/games";
import { requireStudent } from "@/lib/play/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Games" };

// PRD §7.7: each game unlocks when you reach its course; the skill you've
// learned decides the outcome.
export default async function GamesPage() {
  const student = await requireStudent();
  const [games, xpToday] = await Promise.all([loadGames(student), gameXpToday(student.id)]);

  return (
    <WithTabs>
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-black">Games</h1>
          <p className="text-sm text-muted">
            Game XP today: {xpToday}/{GAME_DAILY_CAP}
          </p>
        </header>
        <ul className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => {
            const ready = g.playable && g.unlocked;
            const body = (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{g.trackName}</p>
                <h2 className="text-xl font-black">{g.title}</h2>
                <p className="text-sm text-muted">
                  {!g.playable
                    ? "Coming soon."
                    : !g.unlocked
                      ? `Opens when you start ${g.unlockCourse?.title ?? "its course"}.`
                      : g.plays === 0
                        ? "Ready to play."
                        : g.bestWonLevel > 0
                          ? `Best: level ${g.bestWonLevel} won · ${g.plays} ${g.plays === 1 ? "play" : "plays"}`
                          : `${g.plays} ${g.plays === 1 ? "play" : "plays"} so far`}
                </p>
              </>
            );
            return (
              <li key={g.id}>
                {ready ? (
                  <Link href={`/play/games/${g.slug}`} className="flex h-full flex-col gap-1 rounded-band border-2 border-line bg-surface p-4 transition-colors hover:border-accent">
                    {body}
                  </Link>
                ) : (
                  <div className={cn("flex h-full flex-col gap-1 rounded-band border-2 border-dashed border-line bg-surface p-4")} aria-disabled="true">
                    <span aria-hidden className="self-end text-lg">
                      🔒
                    </span>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </WithTabs>
  );
}
