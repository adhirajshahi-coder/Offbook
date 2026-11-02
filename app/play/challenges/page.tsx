import type { Metadata } from "next";
import { Kube } from "@/components/kid/Kube";
import { WithTabs } from "@/components/kid/TabBar";
import { requireStudent } from "@/lib/play/session";

export const metadata: Metadata = { title: "Challenges" };

// Opens in Phase 4 (PRD §7.7, §7.9).
export default async function ChallengesPage() {
  await requireStudent();
  return (
    <WithTabs>
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-12 text-center">
        <Kube expression="thinking" size={110} />
        <h1 className="text-3xl font-black">Challenges open soon</h1>
        <p className="max-w-md text-muted">Real-world challenges, like making a family budget or interviewing someone about a problem, start soon. Every one comes with a safety note and a parent&apos;s okay.</p>
      </main>
    </WithTabs>
  );
}
