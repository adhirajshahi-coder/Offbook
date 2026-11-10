import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, hqButton, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { PLAYABLE } from "@/lib/play/games";
import { createClient } from "@/lib/supabase/server";
import { GameConfigEditor } from "./GameConfigEditor";

export const metadata: Metadata = { title: "Edit game" };

const HELP: Record<string, string[]> = {
  "budget-bazaar": [
    "levels[]: weeks, startCash, income, needs and goal are in ₹. minJoy is the joy a winner must keep (0–100).",
    "interestPct is weekly interest on savings; riskyOption offers a −5% to +8% investment each week.",
    "events[]: one is drawn per week. Each choice has cash (negative = spend), joy (−30 to 30), a tag (smart, ok or costly) and a why shown after choosing.",
  ],
  "decision-dojo": [
    "scenarios[]: one per level is picked at random from that level's scenarios.",
    "nodes: each option goes to another node or an ending, with points (−2 to 3), the skill it uses and a debrief line.",
    "winAt is the points total needed to win. Every link must resolve, or saving is blocked.",
  ],
  "say-it-better": [
    "rounds[]: each has a level, a goal (clearer, kinder or persuasive), a situation and 2–4 options scored 2 (best), 1 or 0, with a why.",
    "roundsPerRun rounds are drawn per run; winPct is the share of points needed to win.",
    "speak[] prompts and rubric lines drive the optional speaking bonus, which is self-rated and never decides a win. Recordings never leave the device.",
  ],
  "bot-builder": [
    "levels[]: two labels, items (text + label 0 or 1), trainCount items to label, testCount to test on, winAccuracy %.",
    "Use words that clearly belong to each label, or even careful players can't train a good bot.",
    "prompts[]: a goal and 2–4 prompt options, each with the scripted bot reply, points (2 best) and a why.",
  ],
  "startup-sprint": [
    "levels[]: weeks, startCash and goalProfit in ₹, and how many interview questions to pick.",
    "problems[]: unitCost and idealPrice (₹), marketSize (buyers a week at best), interview questions marked good or not, and the bestChannel id.",
    "channels[]: cost per week (₹) and reach (0–1). The right channel for a problem sells 30% better.",
  ],
};

export default async function GameEditPage({ params }: PageProps<"/hq/content/games/[slug]">) {
  await requireStaff(["content"]);
  const { slug } = await params;
  if (!(PLAYABLE as readonly string[]).includes(slug)) notFound();
  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("slug, title, status, config, updated_at").eq("slug", slug).maybeSingle();
  if (!game) notFound();

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={game.title}
        crumbs={[{ href: "/hq/content/games", label: "Games" }]}
        description={`Last saved ${new Date(game.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`}
        actions={
          <>
            <StatusBadge status={game.status} />
            <Link href={`/hq/content/games/${slug}/test`} className={hqButton("secondary")}>
              Test play
            </Link>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <GameConfigEditor slug={slug} initial={JSON.stringify(game.config, null, 2)} status={game.status === "published" ? "published" : "draft"} />
        <Card title="How the config works">
          <ul className="list-disc space-y-2 pl-4 text-sm">
            {HELP[slug].map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#6b6778]">Save, then use Test play to try it as a student would. Test play records nothing.</p>
        </Card>
      </div>
    </div>
  );
}
