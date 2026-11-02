import type { Metadata } from "next";
import { PageHero, Section, ZoneMap } from "@/components/marketing/blocks";
import { getZones } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Tracks",
  description: "Nine zones of real-world skills, from money and communication to AI, coding and leadership.",
};

export default async function TracksPage() {
  const zones = await getZones();
  const total = zones.reduce((n, z) => n + z.courses.length, 0);

  return (
    <>
      <PageHero
        title="Nine zones of real-world skills"
        intro={`${total || "Dozens of"} courses across three levels, from class 6 to class 12. Pick a zone to see what's inside.`}
      />
      <Section title="The world map">
        <ZoneMap zones={zones} />
      </Section>
      <Section title="Three levels" className="bg-[#fafafb]">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Level 1: Foundations", "Classes 6 to 8", "Money, thinking clearly, staying safe online, speaking up and your first code."],
            ["Level 2: Core skills", "Classes 8 to 10", "Start a business, learn Python, build a website, design a product. With choices along the way."],
            ["Level 3: Build and explore", "Classes 10 to 12", "AI and automation, data, real apps and a capstone project you present at a showcase."],
          ].map(([t, c, b]) => (
            <div key={t} className="rounded-[18px] border border-line bg-white p-5">
              <p className="font-display text-lg font-black">{t}</p>
              <p className="text-sm font-semibold text-violet-600">{c}</p>
              <p className="mt-2 text-muted">{b}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
