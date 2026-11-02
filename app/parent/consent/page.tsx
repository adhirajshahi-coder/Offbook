import type { Metadata } from "next";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { requireParent } from "@/lib/auth";
import { CONSENT_VERSION } from "@/lib/consent";
import { formatDate, getChildren } from "@/lib/parent-data";
import { createClient } from "@/lib/supabase/server";
import { setConsent } from "../actions";

export const metadata: Metadata = { title: "Privacy and consent" };

export default async function ConsentPage() {
  await requireParent();
  const children = await getChildren();
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("consent_log")
    .select("student_id, action, version, created_at")
    .order("created_at", { ascending: false });

  const latest = new Map<string, { action: string; version: string; created_at: string }>();
  for (const row of log ?? []) {
    if (row.student_id && !latest.has(row.student_id)) latest.set(row.student_id, row);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Privacy and consent</h1>
        <p className="mt-1 max-w-2xl text-muted">
          You&apos;re the account holder. Offbook stores only your child&apos;s first name, class, avatar and
          learning progress, and uses it only to run their learning. Read the{" "}
          <Link href="/privacy" className="text-violet-600 underline underline-offset-4">
            privacy notice
          </Link>
          .
        </p>
      </div>

      <section className="rounded-[14px] border border-line bg-white p-5">
        <h2 className="text-xl font-black">Consent for each child</h2>
        <ul className="mt-4 divide-y divide-line">
          {children.map((c) => {
            const entry = latest.get(c.id);
            const given = entry?.action === "given" && c.status !== "paused";
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{c.display_name}</p>
                  <p className="text-sm text-muted">
                    {given
                      ? `Consent given ${entry ? formatDate(entry.created_at) : ""} (notice version ${entry?.version})`
                      : entry
                        ? "Consent withdrawn. The profile is paused and can't be opened."
                        : "No consent on record yet. Please give consent to keep using this profile."}
                    {given && entry && entry.version !== CONSENT_VERSION && " · The notice has changed since then."}
                  </p>
                </div>
                <form action={setConsent}>
                  <input type="hidden" name="studentId" value={c.id} />
                  <input type="hidden" name="action" value={given ? "withdraw" : "give"} />
                  <Button type="submit" variant="secondary">
                    {given ? "Withdraw consent" : "Give consent again"}
                  </Button>
                </form>
              </li>
            );
          })}
          {children.length === 0 && <li className="py-3 text-muted">No profiles yet.</li>}
        </ul>
      </section>

      <section className="rounded-[14px] border border-line bg-white p-5">
        <h2 className="text-xl font-black">Your data</h2>
        <p className="mt-2 text-muted">
          Download everything we hold about your family as a file. To delete a child&apos;s profile, go to the
          Children tab.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/parent/export" className={buttonClass("secondary")}>
            Download our data
          </a>
          <Link href="/parent/children" className={buttonClass("ghost")}>
            Manage profiles
          </Link>
        </div>
      </section>
    </div>
  );
}
