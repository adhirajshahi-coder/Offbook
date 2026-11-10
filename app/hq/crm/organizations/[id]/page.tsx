import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, hqButton, PageHeader, StatusBadge } from "@/components/hq/ui";
import { crmStaff, customFields, rupees, crmOwners, timeline } from "@/lib/crm/data";
import { KIND_LABEL } from "@/lib/crm/rules";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ActivityComposer } from "../../ActivityComposer";
import { Timeline } from "../../Timeline";
import { OrgForm, type OrgValues } from "./OrgForm";

export const metadata: Metadata = { title: "Organization" };

/** Pilot cohort stats for a partner school (PRD §12.4), counts only. */
async function cohortStats(schoolId: string) {
  const db = createAdminClient();
  const { data: students } = await db.from("students").select("id, band").eq("school_id", schoolId).is("deleted_at", null);
  const ids = (students ?? []).map((s) => s.id);
  if (!ids.length) return { enrolled: 0, activated: 0, completedCourse: 0, byBand: {} as Record<string, number> };
  const [{ data: started }, { data: done }] = await Promise.all([
    db.from("lesson_progress").select("student_id").in("student_id", ids),
    db.from("course_progress").select("student_id").in("student_id", ids).eq("status", "completed"),
  ]);
  const byBand: Record<string, number> = {};
  for (const s of students ?? []) byBand[s.band] = (byBand[s.band] ?? 0) + 1;
  return { enrolled: ids.length, activated: new Set((started ?? []).map((r) => r.student_id)).size, completedCourse: new Set((done ?? []).map((r) => r.student_id)).size, byBand };
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

export default async function OrganizationPage({ params }: PageProps<"/hq/crm/organizations/[id]">) {
  const { staff, canWrite } = await crmStaff();
  const { id } = await params;
  const isNew = id === "new";
  const supabase = await createClient();
  const [{ data: org }, owners, fields, { data: schools }] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
    crmOwners(),
    customFields("organization"),
    createAdminClient().from("schools").select("id, name, school_code").order("name"),
  ]);
  if (!isNew && !org) notFound();

  const values: OrgValues = org
    ? { name: org.name, kind: org.kind, city: org.city ?? "", state: org.state ?? "", board: org.board ?? "", website: org.website ?? "", owner_id: org.owner_id ?? "", school_id: org.school_id ?? "", custom: org.custom ?? {} }
    : { name: "", kind: "school", city: "", state: "", board: "", website: "", owner_id: staff.id, school_id: "", custom: {} };
  const form = <OrgForm id={isNew ? null : id} initial={values} owners={owners} schools={schools ?? []} fields={fields} canWrite={canWrite} />;

  if (isNew) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="New organization" crumbs={[{ href: "/hq/crm/organizations", label: "Organizations" }]} />
        <Card>{form}</Card>
      </div>
    );
  }

  const [{ data: contacts }, { data: deals }, stats] = await Promise.all([
    supabase.from("contacts").select("id, name, title, kind, email, phone").eq("organization_id", id).order("name"),
    supabase.from("deals").select("id, title, status, value_paise, pipeline_stages(name)").eq("organization_id", id).order("created_at", { ascending: false }),
    org!.school_id ? cohortStats(org!.school_id) : Promise.resolve(null),
  ]);
  const dealIds = (deals ?? []).map((d) => d.id);
  const [orgEvents, dealEvents] = await Promise.all([timeline({ organizationId: id }), dealIds.length ? timeline({ dealIds }) : Promise.resolve([])]);
  const seen = new Set(orgEvents.filter((e) => e.id).map((e) => e.id));
  const events = [...orgEvents, ...dealEvents.filter((e) => !e.id || !seen.has(e.id))].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={org!.name}
        crumbs={[{ href: "/hq/crm/organizations", label: "Organizations" }]}
        description={[org!.city, org!.board].filter(Boolean).join(" · ") || undefined}
        actions={
          canWrite && (
            <>
              <Link href={`/hq/crm/contacts/new?organization=${id}`} className={hqButton("secondary")}>
                Add contact
              </Link>
              <Link href={`/hq/crm/deals/new?pipeline=schools&organization=${id}`} className={hqButton("secondary")}>
                New deal
              </Link>
            </>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {stats && (
            <Card title="Pilot cohort">
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="text-xs text-[#6b6778]">Students enrolled</dt>
                  <dd className="text-2xl font-black tabular-nums">{stats.enrolled}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6b6778]">Activated</dt>
                  <dd className="text-2xl font-black tabular-nums">{pct(stats.activated, stats.enrolled)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6b6778]">Finished a course</dt>
                  <dd className="text-2xl font-black tabular-nums">{pct(stats.completedCourse, stats.enrolled)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-[#6b6778]">Activated = started at least one lesson. Counts only; no student details are shown here.</p>
            </Card>
          )}
          <Card title="Contacts">
            {(contacts ?? []).length === 0 ? (
              <p className="text-sm text-[#6b6778]">No contacts yet.</p>
            ) : (
              <ul className="divide-y divide-[#eeecf2] text-sm">
                {contacts!.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2 py-1.5">
                    <span>
                      <Link href={`/hq/crm/contacts/${c.id}`} className="font-semibold text-violet-700 hover:underline">
                        {c.name}
                      </Link>{" "}
                      <span className="text-xs text-[#6b6778]">{c.title ?? KIND_LABEL[c.kind]}</span>
                    </span>
                    <span className="text-xs text-[#6b6778]">{c.email ?? c.phone ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Deals">
            {(deals ?? []).length === 0 ? (
              <p className="text-sm text-[#6b6778]">No deals yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {deals!.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <Link href={`/hq/crm/deals/${d.id}`} className="text-violet-700 hover:underline">
                      {d.title}
                    </Link>
                    <span className="flex items-center gap-2 text-xs">
                      {(d.pipeline_stages as unknown as { name: string } | null)?.name} · {rupees(d.value_paise)}
                      <StatusBadge status={d.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Details">{form}</Card>
        </div>
        <div className="space-y-4">
          {canWrite && (
            <Card title="Log or schedule">
              <ActivityComposer links={{ organization_id: id }} owners={owners} defaultOwner={org!.owner_id ?? staff.id} />
            </Card>
          )}
          <Card title="Timeline">
            <Timeline events={events} canWrite={canWrite} />
          </Card>
        </div>
      </div>
    </div>
  );
}
