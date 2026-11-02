import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { buttonClass } from "@/components/ui/button";
import type { Policy, PublicPlan, Zone } from "@/lib/public-data";
import { formatRupees } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl px-4 py-14", className)}>
      {eyebrow && <p className="mb-2 text-sm font-semibold text-violet-600">{eyebrow}</p>}
      <h2 className="max-w-3xl text-3xl font-black leading-tight md:text-4xl">{title}</h2>
      {intro && <p className="mt-3 max-w-2xl text-lg text-muted">{intro}</p>}
      {children && <div className="mt-8">{children}</div>}
    </section>
  );
}

export function PageHero({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line bg-violet-50">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{intro}</p>
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
      </div>
    </div>
  );
}

const LEVEL_LABEL: Record<number, string> = { 1: "Level 1", 2: "Level 2", 3: "Level 3" };

export function ZoneMap({ zones, linked = true }: { zones: Zone[]; linked?: boolean }) {
  if (zones.length === 0) return null;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {zones.map((z) => {
        const byLevel = [1, 2, 3].map((l) => z.courses.filter((c) => c.level === l).length);
        const body = (
          <>
            <span aria-hidden className="mb-3 block h-2 w-12 rounded-full" style={{ background: z.color }} />
            <p className="font-display text-xl font-black">{z.zone_name}</p>
            <p className="text-sm text-muted">{z.name}</p>
            <p className="mt-3 text-sm">
              {z.courses.length} {z.courses.length === 1 ? "course" : "courses"}
              <span className="text-muted">
                {" · "}
                {byLevel
                  .map((n, i) => (n ? `${LEVEL_LABEL[i + 1]}: ${n}` : null))
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </p>
          </>
        );
        return (
          <li key={z.slug}>
            {linked ? (
              <Link
                href={`/tracks/${z.slug}`}
                className="block h-full rounded-[18px] border border-line bg-white p-5 transition-colors hover:border-violet-600"
              >
                {body}
              </Link>
            ) : (
              <div className="h-full rounded-[18px] border border-line bg-white p-5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PriceCard({ plan, cta = true }: { plan: PublicPlan | null; cta?: boolean }) {
  if (!plan) {
    return (
      <div className="rounded-[18px] border border-line bg-white p-6 text-muted">
        Pricing is being set up. Check back soon.
      </div>
    );
  }
  const years = Math.round(plan.duration_days / 365);
  return (
    <div className="rounded-[22px] border-2 border-violet-600 bg-white p-6 shadow-sm">
      <p className="font-semibold text-violet-600">{plan.name}</p>
      <p className="mt-2 font-display text-5xl font-black">
        {formatRupees(plan.price_paise)}
        <span className="ml-2 font-sans text-lg font-medium text-muted">
          per child, per {years === 1 ? "year" : `${years} years`}
        </span>
      </p>
      <p className="mt-1 text-sm text-muted">
        {plan.tax_inclusive ? `Includes ${plan.tax_rate}% GST.` : `Plus ${plan.tax_rate}% GST.`} One payment, no
        auto-renewal.
      </p>
      {plan.description && <p className="mt-4">{plan.description}</p>}
      <ul className="mt-4 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden className="font-bold text-violet-600">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {cta && (
        <Link href="/signup" className={buttonClass("primary", "mt-6 w-full")}>
          Create a parent account
        </Link>
      )}
      <p className="mt-3 text-center text-sm text-muted">
        Joining through your school? Enter its code at checkout.
      </p>
    </div>
  );
}

export type Faq = { q: string; a: string };

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-[18px] border border-line bg-white">
      {items.map((f) => (
        <details key={f.q} className="group p-5">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">
            <span className="flex items-center justify-between gap-4">
              {f.q}
              <span aria-hidden className="text-violet-600 transition-transform group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <p className="mt-3 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function PolicyPage({ policy, fallbackTitle }: { policy: Policy | null; fallbackTitle: string }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-black">{policy?.title ?? fallbackTitle}</h1>
      {policy ? (
        <>
          <p className="mt-2 text-sm text-muted">
            Version {policy.version} · updated{" "}
            {new Date(policy.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="prose-offbook mt-8">
            <ReactMarkdown>{policy.body}</ReactMarkdown>
          </div>
        </>
      ) : (
        <p className="mt-6 text-muted">This page is being written. Email us if you have a question.</p>
      )}
    </article>
  );
}
