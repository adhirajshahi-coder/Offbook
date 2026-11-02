import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero, Section } from "@/components/marketing/blocks";
import { PilotForm } from "@/components/marketing/PilotForm";

export const metadata: Metadata = {
  title: "For schools",
  description: "Run an Offbook pilot with zero teacher workload: a school code, a showcase day and a one-page report.",
};

export default function SchoolsPage() {
  return (
    <>
      <PageHero
        title="Real-world skills for your students, zero extra work for your teachers"
        intro="Offbook runs alongside your timetable. Families sign up with your school code, students learn at home, and you get a showcase day and a clear report."
      />

      <Section title="How a pilot works">
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            ["We set you up", "You get a school code. We share a note and a short video for parents."],
            ["Families join", "Parents sign up and add their child with your code. No teacher time needed."],
            ["Students learn", "About 15 minutes a day at home. We handle support and reviews."],
            ["Showcase day", "Students present their projects. You get a one-page report on completion and skills."],
          ].map(([t, b], i) => (
            <li key={t} className="rounded-[18px] border border-line bg-white p-5">
              <p className="text-sm font-semibold text-violet-600">Step {i + 1}</p>
              <p className="font-display text-lg font-black">{t}</p>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="What you'll see in the school report" className="bg-[#fafafb]">
        <figure className="max-w-xl rounded-[18px] border border-line bg-white p-5">
          <p className="text-xs font-semibold text-muted">Sample · illustrative figures</p>
          <p className="mt-2 font-display text-xl font-black">Pilot report, one page</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
            <li>Students enrolled and active each week</li>
            <li>Mission and course completion rates</li>
            <li>Top skills practised across the cohort</li>
            <li>Showcase highlights, shared only with parent consent</li>
          </ul>
        </figure>
      </Section>

      <Section id="pilot" title="Book a pilot" intro="Tell us about your school. We'll call or email within one working day. No pressure, no hard sell.">
        <div className="max-w-2xl">
          <Suspense>
            <PilotForm />
          </Suspense>
        </div>
      </Section>
    </>
  );
}
