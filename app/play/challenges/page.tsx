import type { Metadata } from "next";
import Link from "next/link";
import { Kube } from "@/components/kid/Kube";
import { WithTabs } from "@/components/kid/TabBar";
import { loadChallenges, STATE_LABEL, TYPE_LABEL } from "@/lib/play/challenges";
import { requireStudent } from "@/lib/play/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Challenges" };

// PRD §7.9: real-world challenges, each with a safety note and a parent's okay.
export default async function ChallengesPage() {
  const student = await requireStudent();
  const challenges = await loadChallenges(student);

  return (
    <WithTabs>
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-5">
        <h1 className="text-3xl font-black">Challenges</h1>
        <p className="text-muted">Take what you&apos;ve learned into the real world. Every challenge has a safety note, and a parent says okay before you start.</p>
        {challenges.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Kube expression="sleepy" size={100} />
            <p className="text-muted">No challenges right now. New ones arrive during challenge weeks.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {challenges.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/play/challenges/${c.id}`}
                  className={cn(
                    "flex h-full flex-col gap-1 rounded-band border-2 bg-surface p-4 transition-colors hover:border-accent",
                    c.state === "locked" ? "border-dashed border-line opacity-70" : c.state === "approved" ? "border-mint" : "border-line",
                  )}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    {TYPE_LABEL[c.type]} · {c.trackName}
                  </p>
                  <h2 className="text-xl font-black">{c.title}</h2>
                  <p className="text-sm text-muted">
                    {c.state === "locked" && c.requiredCourse ? `Opens when you start ${c.requiredCourse.title}.` : STATE_LABEL[c.state]}
                  </p>
                  <p className="mt-auto pt-2 text-sm font-bold">+{c.xp} XP</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </WithTabs>
  );
}
