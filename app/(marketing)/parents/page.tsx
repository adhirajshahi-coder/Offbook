import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section } from "@/components/marketing/blocks";
import { buttonClass } from "@/components/ui/button";
import { refundWindowDays } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "For parents",
  description: "What your child learns on Offbook, how much time it takes, how we keep them safe, and how to cancel.",
};

export default async function ParentsPage() {
  const refundDays = await refundWindowDays();

  return (
    <>
      <PageHero
        title="School plus real life"
        intro="Offbook teaches the practical skills that rarely fit in a school timetable, in about 15 minutes a day, in a space built for children."
      >
        <Link href="/signup" className={buttonClass("primary")}>
          Create a parent account
        </Link>
        <Link href="/pricing" className={buttonClass("secondary")}>
          See pricing
        </Link>
      </PageHero>

      <Section title="What we promise, and what we don't">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] border border-line bg-white p-5">
            <p className="font-display text-lg font-black">What your child will do</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
              <li>Short lessons with hands-on practice and instant feedback</li>
              <li>Real projects: a budget, a recorded pitch, a mini business, an AI tool</li>
              <li>A portfolio of their work that you control</li>
            </ul>
          </div>
          <div className="rounded-[18px] border border-line bg-white p-5">
            <p className="font-display text-lg font-black">What we won&apos;t claim</p>
            <p className="mt-3 text-muted">
              We don&apos;t promise marks, ranks or admissions, and we won&apos;t show made-up reviews.
              What we can show you is real progress: lessons finished, skills practised and projects
              made, every week.
            </p>
          </div>
        </div>
      </Section>

      <Section title="A sample weekly summary" intro="Every week you get a short note like this, in the Parent Zone and by email." className="bg-[#fafafb]">
        <figure className="max-w-xl rounded-[18px] border border-line bg-white p-5">
          <p className="text-xs font-semibold text-muted">Sample · not a real student</p>
          <p className="mt-2 font-display text-xl font-black">Aarav&apos;s week</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ["5", "lessons done"],
              ["2", "skills mastered"],
              ["4 of 4", "days goal"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-violet-50 p-3">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl font-black">{v}</dd>
                <p className="text-xs text-muted">{l}</p>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm">
            <span className="font-semibold">Ask Aarav about: </span>
            why &ldquo;only today&rdquo; sales are a trick, and what he&apos;d do with ₹500.
          </p>
        </figure>
      </Section>

      <Section title="Safety, privacy and time">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["No strangers", "No chat, no DMs and no free-text posts between students. Leagues show a first name and an avatar, nothing more."],
            ["Your data, your call", "You're the account holder. We collect only what learning needs. You can download or delete your child's data any time."],
            ["Light on time", "About 15 minutes a day. In exam years, switch to a lighter weekly goal. A gentle break reminder appears after long sessions."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-[18px] border border-line bg-white p-5">
              <p className="font-display text-lg font-black">{t}</p>
              <p className="mt-2 text-muted">{b}</p>
            </div>
          ))}
        </div>
        <Link href="/safety" className="mt-6 inline-block font-semibold text-violet-600 underline underline-offset-4">
          How we keep children safe
        </Link>
      </Section>

      <Section title="Cancelling is easy" className="bg-[#fafafb]">
        <ul className="max-w-2xl space-y-2 text-lg">
          <li>Full refund within {refundDays} days of paying, no questions asked, from the Billing page.</li>
          <li>One payment a year. We never charge you again automatically.</li>
          <li>We remind you 14 and 7 days before the year ends, and you decide.</li>
        </ul>
        <Link href="/refunds" className="mt-6 inline-block font-semibold text-violet-600 underline underline-offset-4">
          Read the refund and cancellation policy
        </Link>
      </Section>
    </>
  );
}
