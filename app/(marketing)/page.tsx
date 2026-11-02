import Link from "next/link";
import { Kube } from "@/components/kid/Kube";
import { buttonClass } from "@/components/ui/button";

// Phase 0 placeholder home. Phase 1 replaces it with the full marketing page
// (try-it challenge, zone map, parent trust block, pricing, FAQ).
export default function HomePage() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.3fr_1fr]">
      <div>
        <h1 className="text-4xl font-black leading-tight md:text-5xl">
          Level up the skills school doesn&apos;t teach.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Money, communication, AI, building a business and leading a team,
          learned through short lessons, games and real projects you can show
          off. For classes 6 to 12.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={buttonClass("primary")}>
            Create a parent account
          </Link>
          <Link href="/login" className={buttonClass("secondary")}>
            Log in
          </Link>
        </div>
      </div>
      <div className="flex justify-center">
        <Kube expression="happy" stage={1} size={220} />
      </div>
    </section>
  );
}
