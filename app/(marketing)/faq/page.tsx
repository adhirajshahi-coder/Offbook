import type { Metadata } from "next";
import { FaqList, PageHero, Section } from "@/components/marketing/blocks";
import { FULL_FAQ } from "../faq-data";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions from parents and schools." };

export default function FaqPage() {
  return (
    <>
      <PageHero title="Questions and answers" intro="Can't find what you need? Email us and a real person will reply." />
      <Section title="Everything parents ask us">
        <FaqList items={FULL_FAQ} />
      </Section>
    </>
  );
}
