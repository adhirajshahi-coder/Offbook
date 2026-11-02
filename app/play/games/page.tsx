import type { Metadata } from "next";
import { Kube } from "@/components/kid/Kube";
import { WithTabs } from "@/components/kid/TabBar";
import { requireStudent } from "@/lib/play/session";

export const metadata: Metadata = { title: "Games" };

// Opens in Phase 4 (PRD §7.7, §7.9).
export default async function GamesPage() {
  await requireStudent();
  return (
    <WithTabs>
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-12 text-center">
        <Kube expression="thinking" size={110} />
        <h1 className="text-3xl font-black">Games open soon</h1>
        <p className="max-w-md text-muted">Budget Bazaar and Decision Dojo are being built. Each game unlocks when you reach its course, and the skill you&apos;ve learned decides the outcome.</p>
      </main>
    </WithTabs>
  );
}
