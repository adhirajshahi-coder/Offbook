import type { Metadata } from "next";
import { Kube } from "@/components/kid/Kube";
import { PageHero, Section } from "@/components/marketing/blocks";

export const metadata: Metadata = { title: "Showcase", description: "Real projects by Offbook students, shared with parent consent." };

// Approved student work appears here from Phase 4, only with parent consent
// and staff approval (PRD §7.9, §13). Until then, say so honestly.
export default function ShowcasePage() {
  return (
    <>
      <PageHero
        title="Student showcase"
        intro="Budgets, pitches, mini businesses and AI tools made by Offbook students."
      />
      <Section title="The first projects are on their way">
        <div className="flex max-w-2xl items-center gap-6">
          <Kube expression="thinking" size={96} />
          <p className="text-lg text-muted">
            We only show real work, and only when a parent has said yes and our team has checked it.
            The first projects will appear here after our first students finish their missions.
          </p>
        </div>
      </Section>
    </>
  );
}
