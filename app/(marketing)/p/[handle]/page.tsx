import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Kube } from "@/components/kid/Kube";
import { BAND_LABEL } from "@/lib/bands";
import { RANK_LABEL, type Rank } from "@/lib/gamification/xp";
import { publicPortfolio, SOURCE_LABEL } from "@/lib/portfolio";

// A child's page: shared by the parent, never indexed by search engines.
export const metadata: Metadata = { title: "Portfolio", robots: { index: false, follow: false } };

export default async function PublicPortfolioPage({ params }: PageProps<"/p/[handle]">) {
  const { handle } = await params;
  const p = await publicPortfolio(handle);
  if (!p) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <Kube expression="happy" size={90} />
        <h1 className="font-display text-4xl font-black">{p.name}&apos;s portfolio</h1>
        <p className="text-muted">
          {BAND_LABEL[p.band as keyof typeof BAND_LABEL]} · {RANK_LABEL[p.rank as Rank] ?? p.rank} on Offbook
        </p>
      </header>

      {p.certificates.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-black">Certificates</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.certificates.map((c) => (
              <li key={c.code}>
                <Link href={`/certificates/${c.code}`} className="inline-flex rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:bg-violet-50">
                  🏅 {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-black">Projects</h2>
        {p.items.length === 0 ? (
          <p className="mt-2 text-muted">Nothing shared yet.</p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {p.items.map((i) => (
              <li key={i.id} className="rounded-2xl border border-line bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{SOURCE_LABEL[i.source_type]}</p>
                <h3 className="text-lg font-black">{i.title}</h3>
                {i.summary && <p className="mt-1 text-sm text-muted">{i.summary}</p>}
                {i.skills.length > 0 && <p className="mt-2 text-xs font-semibold text-muted">Skills: {i.skills.join(" · ")}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
