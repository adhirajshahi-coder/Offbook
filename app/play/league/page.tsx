import type { Metadata } from "next";
import Link from "next/link";
import { Kube } from "@/components/kid/Kube";
import { WithTabs } from "@/components/kid/TabBar";
import { TIER_LABEL } from "@/lib/gamification/leagues";
import { loadLeague } from "@/lib/play/league";
import { requireStudent } from "@/lib/play/session";
import { cn } from "@/lib/utils";
import { Reactions } from "./Reactions";

export const metadata: Metadata = { title: "League" };

const ZONE_CLASS = { promoted: "border-mint", stayed: "border-line", demoted: "border-coral" } as const;

export default async function LeaguePage() {
  const student = await requireStudent();

  if (!student.league_opt_in) {
    return (
      <WithTabs>
        <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-12 text-center">
          <Kube expression="sleepy" size={100} />
          <h1 className="text-3xl font-black">Weekly leagues</h1>
          <p className="text-muted">Race 20–30 learners your age for XP each week. Ask a parent to turn leagues on in the Parent Zone.</p>
          <Link href="/play/me" className="underline underline-offset-4">
            Back to Me
          </Link>
        </main>
      </WithTabs>
    );
  }

  const league = await loadLeague(student);
  const me = league.rows.find((r) => r.me);

  return (
    <WithTabs>
      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">This week</p>
          <h1 className="text-3xl font-black">{TIER_LABEL[league.tier]} league</h1>
          <p className="text-muted">
            {me ? `You're #${me.rank} with ${me.xp} XP. ` : ""}Ends Sunday at midnight.
          </p>
        </header>
        <p className="text-center text-sm text-muted">
          Top 5 move up a league, bottom 5 move down. <span className="font-semibold text-text">Every lesson counts.</span>
        </p>
        <ol className="flex flex-col gap-2">
          {league.rows.map((r) => (
            <li key={r.studentId} className={cn("flex items-center gap-3 rounded-band border-2 bg-surface p-3", ZONE_CLASS[r.zone], r.me && "ring-2 ring-accent")}>
              <span className="w-7 text-center text-lg font-black tabular-nums">{r.rank}</span>
              <span className="flex-1 font-semibold">
                {r.name}
                {r.me && " (you)"}
                <span className="block text-xs font-normal text-muted">{r.zone === "promoted" ? "Moving up" : r.zone === "demoted" ? "At risk of moving down" : " "}</span>
              </span>
              <span className="font-bold tabular-nums">{r.xp} XP</span>
              <Reactions toStudentId={r.studentId} counts={r.reactions} sent={r.sentByMe} self={r.me} />
            </li>
          ))}
        </ol>
      </main>
    </WithTabs>
  );
}
