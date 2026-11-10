import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, hqButton, PageHeader, StatusBadge } from "@/components/hq/ui";
import { crmStaff, customFields, rupees, crmOwners, timeline } from "@/lib/crm/data";
import { createClient } from "@/lib/supabase/server";
import { ActivityComposer } from "../../ActivityComposer";
import { Timeline } from "../../Timeline";
import { ContactForm, type ContactValues } from "./ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params, searchParams }: PageProps<"/hq/crm/contacts/[id]">) {
  const { staff, canWrite } = await crmStaff();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const supabase = await createClient();
  const [{ data: c }, { data: orgs }, owners, fields] = await Promise.all([
    isNew ? Promise.resolve({ data: null }) : supabase.from("contacts").select("*, organizations(id, name), campaigns(name)").eq("id", id).maybeSingle(),
    supabase.from("organizations").select("id, name").order("name").limit(500),
    crmOwners(),
    customFields("contact"),
  ]);
  if (!isNew && !c) notFound();

  const values: ContactValues = c
    ? {
        name: c.name,
        email: c.email ?? "",
        phone: c.phone ?? "",
        title: c.title ?? "",
        kind: c.kind,
        organization_id: c.organization_id ?? "",
        owner_id: c.owner_id ?? "",
        source: c.source ?? "",
        custom: c.custom ?? {},
      }
    : { name: "", email: "", phone: "", title: "", kind: "coordinator", organization_id: typeof sp.organization === "string" ? sp.organization : "", owner_id: staff.id, source: "manual", custom: {} };
  const form = <ContactForm id={isNew ? null : id} initial={values} orgs={orgs ?? []} owners={owners} fields={fields} canWrite={canWrite} />;

  if (isNew) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="New contact" crumbs={[{ href: "/hq/crm/contacts", label: "Contacts" }]} />
        <Card>{form}</Card>
      </div>
    );
  }

  const [{ data: deals }, events] = await Promise.all([
    supabase.from("deals").select("id, title, status, value_paise, pipeline_stages(name)").eq("contact_id", id).order("created_at", { ascending: false }),
    timeline({ contactId: id }),
  ]);
  const dealEvents = deals?.length ? await timeline({ dealIds: deals.map((d) => d.id) }) : [];
  const merged = [...events, ...dealEvents.filter((e) => e.kind !== "activity")].sort((a, b) => b.at.localeCompare(a.at));
  const org = c!.organizations as { id: string; name: string } | null;
  const utm = (c!.utm ?? {}) as Record<string, string>;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={c!.name}
        crumbs={[{ href: "/hq/crm/contacts", label: "Contacts" }]}
        description={[c!.title, org?.name].filter(Boolean).join(" · ") || undefined}
        actions={
          canWrite && (
            <Link href={`/hq/crm/deals/new?pipeline=schools&contact=${id}${org ? `&organization=${org.id}` : ""}`} className={hqButton("secondary")}>
              New deal
            </Link>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card title="Details">{form}</Card>
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
          <Card title="Where they came from">
            <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
              <dt className="text-[#6b6778]">Source</dt>
              <dd>{c!.source ?? "—"}</dd>
              <dt className="text-[#6b6778]">Campaign</dt>
              <dd>{(c!.campaigns as { name: string } | null)?.name ?? "—"}</dd>
              <dt className="text-[#6b6778]">Referrer</dt>
              <dd className="break-all">{c!.referrer ?? "—"}</dd>
              {Object.entries(utm).map(([k, v]) => (
                <span key={k} className="contents">
                  <dt className="text-[#6b6778]">{k}</dt>
                  <dd>{v}</dd>
                </span>
              ))}
            </dl>
          </Card>
        </div>
        <div className="space-y-4">
          {canWrite && (
            <Card title="Log or schedule">
              <ActivityComposer links={{ contact_id: id, ...(org ? { organization_id: org.id } : {}) }} owners={owners} defaultOwner={c!.owner_id ?? staff.id} />
            </Card>
          )}
          <Card title="Timeline">
            <Timeline events={merged} canWrite={canWrite} />
          </Card>
        </div>
      </div>
    </div>
  );
}
