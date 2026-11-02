import Link from "next/link";
import { FaqList, PriceCard, Section, ZoneMap } from "@/components/marketing/blocks";
import { TryItChallenge } from "@/components/marketing/TryItChallenge";
import { buttonClass } from "@/components/ui/button";
import { getPlan, getZones, refundWindowDays } from "@/lib/public-data";
import { HOME_FAQ } from "./faq-data";

const BUILDS = [
  { title: "A real budget", body: "Plan a month on ₹10,000, then a year of savings." },
  { title: "A pitch you've recorded", body: "Three minutes, improved after feedback, ready to share." },
  { title: "Your own AI tool", body: "Train a tiny classifier and write a user manual for it." },
  { title: "A mini business", body: "Pick a problem, sell something small and count the profit." },
  { title: "A leadership project", body: "Plan a real project with a team board and a retro." },
];

const LOOP = [
  { step: "Watch", body: "A 2 to 5 minute clip or card deck. One idea at a time." },
  { step: "Try", body: "Hands-on practice with instant feedback. Sliders, scenarios, drag and drop." },
  { step: "Twist", body: "A second look and a harder try. This is where it sticks." },
  { step: "Make", body: "Use it in real life, in the smallest way. It goes in your portfolio." },
];

export default async function HomePage() {
  const [zones, plan, refundDays] = await Promise.all([getZones(), getPlan(), refundWindowDays()]);

  return (
    <>
      <section className="bg-gradient-to-b from-violet-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <h1 className="text-4xl font-black leading-[1.05] md:text-6xl">
              Level up the skills school doesn&apos;t teach.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Money, speaking up, AI, building a business and leading a team. Short lessons, games
              and real projects you can show off. For classes 6 to 12, about 15 minutes a day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={buttonClass("primary")}>
                Create a parent account
              </Link>
              <Link href="/how-it-works" className={buttonClass("secondary")}>
                See how it works
              </Link>
            </div>
          </div>
          <TryItChallenge />
        </div>
      </section>

      <Section
        eyebrow="The world"
        title={`${zones.length || "Nine"} zones, one road ahead`}
        intro="Every topic is on the map from day one. Courses unlock one at a time, so you finish what you start."
      >
        <ZoneMap zones={zones} />
      </Section>

      <Section eyebrow="What you'll build" title="Things you can actually show people">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BUILDS.map((b) => (
            <li key={b.title} className="rounded-[18px] border border-line bg-white p-5">
              <p className="font-display text-lg font-black">{b.title}</p>
              <p className="mt-2 text-sm text-muted">{b.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="How it works" title="Watch, try, twist, make" className="bg-[#fafafb]">
        <ol className="grid gap-4 md:grid-cols-4">
          {LOOP.map((l, i) => (
            <li key={l.step} className="rounded-[18px] border border-line bg-white p-5">
              <p className="text-sm font-semibold text-violet-600">Step {i + 1}</p>
              <p className="font-display text-xl font-black">{l.step}</p>
              <p className="mt-2 text-sm text-muted">{l.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-muted">
          Get something wrong? Kube says &ldquo;Oops, good try&rdquo;, shows you why, and gives you
          a fresh one. No hearts, no lockouts. Bouncing back earns bonus XP.
        </p>
      </Section>

      <Section eyebrow="For parents" title="Built to earn your trust">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["A safe space", "No chat, no DMs, no ads, no trackers. Your child uses a first name only."],
            ["Light on time", "Around 15 minutes a day. Designed to sit alongside board exam prep, not compete with it."],
            ["Easy to leave", `Full refund within ${refundDays} days, no questions asked. We never auto-charge.`],
          ].map(([t, b]) => (
            <div key={t} className="rounded-[18px] border border-line bg-white p-5">
              <p className="font-display text-lg font-black">{t}</p>
              <p className="mt-2 text-muted">{b}</p>
            </div>
          ))}
        </div>
        <Link href="/parents" className="mt-6 inline-block font-semibold text-violet-600 underline underline-offset-4">
          More for parents
        </Link>
      </Section>

      <Section eyebrow="Pricing" title="One plan. Everything included.">
        <div className="max-w-md">
          <PriceCard plan={plan} />
        </div>
      </Section>

      <Section eyebrow="Questions" title="Good questions parents ask">
        <FaqList items={HOME_FAQ} />
      </Section>
    </>
  );
}
