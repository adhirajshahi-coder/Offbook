import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadChallenges, STATE_LABEL, TYPE_LABEL } from "@/lib/play/challenges";
import { requireStudent } from "@/lib/play/session";
import { ChallengeActions } from "./ChallengeActions";

export const metadata: Metadata = { title: "Challenge" };

export default async function ChallengePage({ params }: PageProps<"/play/challenges/[id]">) {
  const { id } = await params;
  const student = await requireStudent();
  const c = (await loadChallenges(student)).find((x) => x.id === id);
  if (!c) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
      <Link href="/play/challenges" className="text-sm text-muted underline underline-offset-4">
        ← All challenges
      </Link>
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          {TYPE_LABEL[c.type]} · {c.trackName} · +{c.xp} XP
        </p>
        <h1 className="text-3xl font-black">{c.title}</h1>
        <p className="mt-1 text-sm font-semibold">{STATE_LABEL[c.state]}</p>
      </header>

      <section className="rounded-band border border-line bg-surface p-4">
        <h2 className="font-black">The challenge</h2>
        <p className="mt-1 whitespace-pre-line">{c.brief}</p>
      </section>

      <section className="rounded-band border-2 border-sun bg-surface p-4">
        <h2 className="font-black">Stay safe</h2>
        <p className="mt-1">{c.safetyNote}</p>
      </section>

      {c.rubric.length > 0 && (
        <section className="rounded-band border border-line bg-surface p-4">
          <h2 className="font-black">What reviewers look for</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {c.rubric.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {c.feedback && (c.state === "revision" || c.state === "rejected" || c.state === "approved") && (
        <section className="rounded-band border-l-4 border-accent bg-surface-2 p-4">
          <h2 className="font-black">Reviewer feedback</h2>
          <p className="mt-1 whitespace-pre-line">{c.feedback}</p>
        </section>
      )}

      <ChallengeActions id={c.id} state={c.state} requiredCourse={c.requiredCourse} />
    </main>
  );
}
