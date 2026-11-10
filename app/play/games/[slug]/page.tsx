import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Kube } from "@/components/kid/Kube";
import { buttonClass } from "@/components/ui/button";
import { gameXpToday, levelsOf, levelTitles, loadGames, openLevels, parseGameConfig } from "@/lib/play/games";
import { requireStudent } from "@/lib/play/session";
import { createAdminClient } from "@/lib/supabase/server";
import { GameView } from "./GameView";

export const metadata: Metadata = { title: "Game" };

const INTRO: Record<string, string> = {
  "budget-bazaar": "Run your pocket money week by week. Pay for needs, handle surprises, save toward a goal, and still have some fun.",
  "decision-dojo": "Step into a tricky situation. Each choice changes the story, and the debrief shows the thinking behind it.",
  "say-it-better": "Rapid rounds: pick the clearer, kinder or more persuasive line. Then a bonus 30-second speaking challenge.",
  "bot-builder": "Train a tiny AI by labelling examples, test it on new ones, then write prompts that get good answers.",
  "startup-sprint": "Pick a problem, interview customers, set a price and find buyers. Your decisions decide the sales.",
};

export default async function GamePage({ params }: PageProps<"/play/games/[slug]">) {
  const { slug } = await params;
  const student = await requireStudent();
  const card = (await loadGames(student)).find((g) => g.slug === slug);
  if (!card || !card.playable) notFound();

  if (!card.unlocked) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-12 text-center">
        <Kube expression="sleepy" size={110} />
        <h1 className="text-3xl font-black">{card.title} is locked</h1>
        <p className="text-muted">It opens when you start {card.unlockCourse?.title ?? "its course"} on your Journey.</p>
        <Link href="/play/games" className={buttonClass("secondary")}>
          Back to games
        </Link>
      </main>
    );
  }

  const db = createAdminClient();
  const [{ data }, xpToday] = await Promise.all([db.from("games").select("config").eq("id", card.id).single(), gameXpToday(student.id)]);
  const game = parseGameConfig(slug, data?.config);
  if (!game) notFound();

  const all = levelsOf(game);
  const open = openLevels(all, card.bestWonLevel);
  const titles = levelTitles(game);
  const levelTitle = (l: number) => titles.get(l) ?? `Level ${l}`;
  const levels = all.map((l) => ({ level: l, title: levelTitle(l), open: open.includes(l), won: l <= card.bestWonLevel }));
  const intro = card.description || INTRO[slug] || "";

  return <GameView slug={game.slug} config={game.config} levels={levels} xpToday={xpToday} title={card.title} intro={intro} />;
}
