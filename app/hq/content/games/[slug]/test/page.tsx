import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BudgetBazaar } from "@/app/play/games/[slug]/BudgetBazaar";
import { DecisionDojo } from "@/app/play/games/[slug]/DecisionDojo";
import { Notice } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { levelsOf, parseGameConfig } from "@/lib/play/games";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Test play" };

/** Play the saved config as a student would; every level open, nothing recorded. */
export default async function GameTestPage({ params }: PageProps<"/hq/content/games/[slug]/test">) {
  await requireStaff(["content"]);
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("title, description, config").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const game = parseGameConfig(slug, data.config);
  if (!game) return <Notice tone="error">The saved config doesn&apos;t pass validation, so it can&apos;t be played. Fix it in the editor first.</Notice>;

  const levels = levelsOf(game).map((l) => ({
    level: l,
    title: game.slug === "budget-bazaar" ? (game.config.levels.find((x) => x.level === l)?.title ?? `Level ${l}`) : `Level ${l}`,
    open: true,
    won: false,
  }));
  const common = { levels, xpToday: 0, title: data.title, intro: data.description, preview: true };

  return (
    <div data-band="explore" className="-m-5 min-h-full bg-bg text-text">
      {game.slug === "budget-bazaar" ? <BudgetBazaar config={game.config} {...common} /> : <DecisionDojo config={game.config} {...common} />}
    </div>
  );
}
