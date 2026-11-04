import type { Metadata } from "next";
import { Kube } from "@/components/kid/Kube";
import { PageHero, Section } from "@/components/marketing/blocks";
import { BAND_LABEL } from "@/lib/bands";
import { showcaseItems, SOURCE_LABEL } from "@/lib/portfolio";

export const metadata: Metadata = { title: "Showcase", description: "Real projects by Offbook students, shared with parent consent." };

// Only work a parent agreed to share AND our team approved (PRD §7.9, §13).
// First names and class band only.
export default async function ShowcasePage() {
  const items = await showcaseItems();
  return (
    <>
      <PageHero title="Student showcase" intro="Budgets, pitches, mini businesses and AI tools made by Offbook students." />
      {items.length === 0 ? (
        <Section title="The first projects are on their way">
          <div className="flex max-w-2xl items-center gap-6">
            <Kube expression="thinking" size={96} />
            <p className="text-lg text-muted">
              We only show real work, and only when a parent has said yes and our team has checked it. The first projects will appear here soon.
            </p>
          </div>
        </Section>
      ) : (
        <Section title="Recent projects">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <li key={i.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{SOURCE_LABEL[i.source_type]}</p>
                <h3 className="text-lg font-black">{i.title}</h3>
                <p className="text-sm text-muted">{i.summary}</p>
                <p className="mt-auto pt-2 text-sm font-semibold">
                  {i.name} · {BAND_LABEL[i.band as keyof typeof BAND_LABEL]}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">Shared with each parent&apos;s permission and checked by the Offbook team.</p>
        </Section>
      )}
    </>
  );
}
