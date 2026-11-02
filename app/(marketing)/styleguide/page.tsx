import type { Metadata } from "next";
import { CubeMark, LevelUpArrow, Wordmark } from "@/components/brand/Logo";
import { Kube } from "@/components/kid/Kube";
import { KUBE_EXPRESSIONS, type KubeStage } from "@/components/kid/kube-types";
import { buttonClass } from "@/components/ui/button";
import { BAND_LABEL, type Band } from "@/lib/bands";

export const metadata: Metadata = { title: "Style guide" };

const BANDS: { band: Band; classes: string }[] = [
  { band: "explore", classes: "Classes 6 to 8" },
  { band: "build", classes: "Classes 9 to 10" },
  { band: "launch", classes: "Classes 11 to 12" },
];

const STAGES: { stage: KubeStage; rank: string }[] = [
  { stage: 0, rank: "Rookie" },
  { stage: 1, rank: "Explorer" },
  { stage: 2, rank: "Builder" },
  { stage: 3, rank: "Maker" },
  { stage: 4, rank: "Pioneer" },
  { stage: 5, rank: "Founder" },
  { stage: 6, rank: "Legend" },
];

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <section>
        <h1 className="text-3xl font-black">Offbook style guide</h1>
        <p className="mt-2 text-muted">
          Brand marks, band themes and Kube, as built in Phase 0.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black">Logo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-center rounded-band border border-line bg-white p-8">
            <Wordmark className="h-14 w-auto" />
          </div>
          <div className="flex items-center justify-center rounded-band bg-night p-8">
            <Wordmark tone="dark" className="h-14 w-auto" />
          </div>
          <div className="flex items-center justify-center gap-8 rounded-band border border-line bg-white p-8">
            <CubeMark className="h-16 w-auto" />
            <LevelUpArrow className="h-14 w-auto text-violet-600" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black">Band themes</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {BANDS.map(({ band, classes }) => (
            <div
              key={band}
              data-band={band}
              className="space-y-4 rounded-band border border-line bg-bg p-5 text-text"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-xl font-black">{BAND_LABEL[band]}</p>
                  <p className="text-sm text-muted">{classes}</p>
                </div>
                <Kube
                  expression="happy"
                  size={band === "explore" ? 84 : band === "build" ? 64 : 52}
                  animate={false}
                />
              </div>
              <div className="rounded-band border border-line bg-surface p-4">
                <p className="text-sm text-muted">Continue</p>
                <p className="font-semibold">Mission 2, Lesson 3</p>
                <button className={buttonClass("primary", "mt-3 w-full")}>Play</button>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="rounded-full bg-sun px-3 py-1 font-semibold text-ink">+30 XP</span>
                <span className="rounded-full bg-mint px-3 py-1 font-semibold text-ink">Done</span>
                <span className="rounded-full bg-sky px-3 py-1 font-semibold text-ink">Hint</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black">Kube expressions</h2>
        <div className="flex flex-wrap gap-6">
          {KUBE_EXPRESSIONS.map((e) => (
            <figure key={e} className="flex flex-col items-center gap-2">
              <Kube expression={e} size={96} />
              <figcaption className="text-sm text-muted">{e}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-black">Kube evolves with rank</h2>
        <div className="flex flex-wrap gap-6">
          {STAGES.map(({ stage, rank }) => (
            <figure key={stage} className="flex flex-col items-center gap-2">
              <Kube expression="happy" stage={stage} size={80} animate={false} />
              <figcaption className="text-sm text-muted">{rank}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
