import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/marketing/blocks";
import { buttonClass } from "@/components/ui/button";
import { getZones } from "@/lib/public-data";

export async function generateMetadata({ params }: PageProps<"/tracks/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const zone = (await getZones()).find((z) => z.slug === slug);
  return zone
    ? { title: zone.zone_name, description: `${zone.name}: ${zone.courses.length} Offbook courses.` }
    : { title: "Zone not found" };
}

const LEVEL = {
  1: "Level 1 · Classes 6 to 8",
  2: "Level 2 · Classes 8 to 10",
  3: "Level 3 · Classes 10 to 12",
} as Record<number, string>;

export default async function ZonePage({ params }: PageProps<"/tracks/[slug]">) {
  const { slug } = await params;
  const zones = await getZones();
  const zone = zones.find((z) => z.slug === slug);
  if (!zone) notFound();

  const levels = [1, 2, 3].filter((l) => zone.courses.some((c) => c.level === l));

  return (
    <>
      <PageHero title={zone.zone_name} intro={`${zone.name}. ${zone.courses.length} courses, each ending in a real project.`}>
        <Link href="/tracks" className={buttonClass("secondary")}>
          All zones
        </Link>
        <Link href="/signup" className={buttonClass("primary")}>
          Create a parent account
        </Link>
      </PageHero>

      {levels.map((level) => (
        <Section key={level} title={LEVEL[level]}>
          <ul className="grid gap-4 md:grid-cols-2">
            {zone.courses
              .filter((c) => c.level === level)
              .map((c) => (
                <li key={c.slug} className="rounded-[18px] border border-line bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-lg font-black">{c.short_title ?? c.title}</p>
                    {c.priority === "elective" && (
                      <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                        Choice
                      </span>
                    )}
                  </div>
                  {c.short_title && <p className="text-sm text-muted">{c.title}</p>}
                  <p className="mt-2">{c.promise}</p>
                  {c.capstone?.brief && (
                    <p className="mt-3 text-sm text-muted">
                      <span className="font-semibold text-ink">You&apos;ll make: </span>
                      {c.capstone.brief}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
