import type { Metadata } from "next";
import Link from "next/link";
import { Kube } from "@/components/kid/Kube";
import { PageHero, Section } from "@/components/marketing/blocks";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description: "Short lessons, hands-on practice, games and real projects. How Offbook turns real-world skills into a game.",
};

const STRUCTURE = [
  { name: "Zone", body: "Nine areas on the world map, from Founders' Forge to Bot Bay." },
  { name: "Course", body: "About 10 weeks. Ends in a capstone project for your portfolio." },
  { name: "Mission", body: "A 3 to 4 week sprint that ends in something real, plus a boss challenge." },
  { name: "Lesson", body: "2 to 5 minutes of input, then practice. Fits in a bus ride." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="Learn by doing, not by reading"
        intro="Every Offbook lesson follows the same loop: watch a little, try it, take a second look, then use it in real life."
      >
        <Link href="/signup" className={buttonClass("primary")}>
          Create a parent account
        </Link>
      </PageHero>

      <Section title="The learning loop">
        <ol className="grid gap-4 md:grid-cols-2">
          {[
            ["Watch", "A short clip from a teacher, or a swipeable card deck. One idea per clip, 2 to 5 minutes."],
            ["Try", "Interactive practice with instant feedback: sliders, drag and drop, scenarios and tiny simulators."],
            ["Twist", "A second look from a new angle, then a harder try. Watch again, practise again: that's how it sticks."],
            ["Make", "Apply it to your life in the smallest way. Write a 3-line pitch, list your real spends, record a 30-second talk."],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-4 rounded-[18px] border border-line bg-white p-5">
              <span className="font-display text-3xl font-black text-violet-600">{i + 1}</span>
              <div>
                <p className="font-display text-xl font-black">{t}</p>
                <p className="mt-1 text-muted">{b}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Fail safely, bounce back" className="bg-[#fafafb]">
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <Kube expression="oops" size={120} />
          <div className="space-y-3 text-lg">
            <p>
              Wrong answers aren&apos;t a dead end. Kube says &ldquo;Oops, good try&rdquo;, explains why,
              and hands you a fresh question on the same idea.
            </p>
            <p className="text-muted">
              Retries are unlimited. There are no hearts and no lockouts. Getting it right after a
              mistake earns Bounce-back XP, and missed questions come back in the Daily Warm-up a
              few days later so they stick.
            </p>
          </div>
        </div>
      </Section>

      <Section title="How the world is organised">
        <ul className="grid gap-4 md:grid-cols-4">
          {STRUCTURE.map((s) => (
            <li key={s.name} className="rounded-[18px] border border-line bg-white p-5">
              <p className="font-display text-xl font-black">{s.name}</p>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-muted">
          Courses unlock in order, one at a time, so you finish what you start. You can see every
          course on the map from day one, and every skill connects to others across zones.
        </p>
      </Section>

      <Section title="Levels, ranks and leagues" className="bg-[#fafafb]">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["XP and levels", "Earn XP for lessons, practice, games and projects. Levels unlock new looks for your avatar and Kube."],
            ["Ranks", "Finish a course to rank up, from Rookie to Legend. Kube evolves with you."],
            ["Weekly leagues", "If a parent opts in, compete with 20 to 30 students your age on weekly XP. First names only, no chat."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-[18px] border border-line bg-white p-5">
              <p className="font-display text-lg font-black">{t}</p>
              <p className="mt-2 text-muted">{b}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
