import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { requireParent } from "@/lib/auth";
import { BAND_LABEL } from "@/lib/bands";
import { formatDate, getChildren } from "@/lib/parent-data";
import { formatRupees } from "@/lib/pricing";
import { getPlan } from "@/lib/public-data";
import { AddChildForm } from "./AddChildForm";

export const metadata: Metadata = { title: "Parent Zone" };

export default async function ParentHome({ searchParams }: PageProps<"/parent">) {
  const [parent, children, plan, { paid }] = await Promise.all([requireParent(), getChildren(), getPlan(), searchParams]);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_340px]">
      <section>
        <h1 className="text-3xl font-black">Hi{parent.name ? `, ${parent.name.split(" ")[0]}` : ""}</h1>
        <p className="mt-1 text-muted">Your children&apos;s profiles and plans.</p>

        {paid && (
          <p role="status" className="mt-4 rounded-[14px] border border-[#a8e9d3] bg-[#e9fbf4] px-4 py-3">
            Payment received. Your receipt is on its way, and it&apos;s also under Billing.
          </p>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {children.map((c) => (
            <li key={c.id} className="rounded-[14px] border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.display_name}</p>
                  <p className="text-sm text-muted">
                    Class {c.class_grade} · {BAND_LABEL[c.band]} · Level {c.content_level}
                  </p>
                  <p className="mt-1 text-sm">
                    {c.status === "paused" ? (
                      <span className="text-muted">Paused: consent withdrawn</span>
                    ) : c.activeUntil ? (
                      <span className="text-[#0b7a57]">Active until {formatDate(c.activeUntil)}</span>
                    ) : (
                      <span className="text-muted">Not active yet</span>
                    )}
                  </p>
                </div>
                {c.status === "active" &&
                  (c.activeUntil ? (
                    <Link href="/play" className={buttonClass("secondary")}>
                      Open Play
                    </Link>
                  ) : (
                    <Link href={`/parent/checkout/${c.id}`} className={buttonClass("primary")}>
                      Start {c.display_name}&apos;s year{plan ? ` · ${formatRupees(plan.price_paise)}` : ""}
                    </Link>
                  ))}
              </div>
            </li>
          ))}
          {children.length === 0 && (
            <li className="rounded-[14px] border border-dashed border-line bg-white p-6 text-muted">
              No profiles yet. Add your child to get started.
            </li>
          )}
        </ul>
      </section>

      <section className="h-fit rounded-[14px] border border-line bg-white p-5">
        <h2 className="mb-4 text-xl font-black">Add a child</h2>
        <AddChildForm />
      </section>
    </div>
  );
}
