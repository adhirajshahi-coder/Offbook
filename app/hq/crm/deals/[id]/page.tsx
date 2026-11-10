import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Notice, PageHeader, StatusBadge } from "@/components/hq/ui";
import { crmStaff, customFields, rupees, crmOwners, timeline } from "@/lib/crm/data";
import { STALE_LABEL, staleReason } from "@/lib/crm/rules";
import { createClient } from "@/lib/supabase/server";
import { ActivityComposer } from "../../ActivityComposer";
import { Timeline } from "../../Timeline";
import { DealForm, type DealValues } from "./DealForm";

export const metadata: Metadata = { title: "Deal" };

export default async function DealPage({ params, searchParams }: PageProps<"/hq/crm/deals/[id]">) {
  const { staff, canWrite } = await crmStaff();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const supabase = await createClient();

  const { data: deal } = isNew
    ? { data: null }
    : await supabase
        .from("deals")
        .select("*, pipelines(slug, name, stale_days), organizations(id, name), contacts(id, name), families(parent_id, parents(name, email)), activities(due_at, done_at)")
        .eq("id", id)
        .maybeSingle();
  if (!isNew && !deal) notFound();

  const pipelineSlug = isNew ? (typeof sp.pipeline === "string" ? sp.pipeline : "schools") : (deal!.pipelines as { slug: string }).slug;
  const [{ data: pipeline }, { data: orgs }, { data: contacts }, { data: campaigns }, owners, fields] = await Promise.all([
    supabase.from("pipelines").select("id, name, stale_days, pipeline_stages(id, name, order_index, outcome)").eq("slug", pipelineSlug).single(),
    supabase.from("organizations").select("id, name").order("name").limit(500),
    supabase.from("contacts").select("id, name").order("name").limit(500),
    supabase.from("campaigns").select("id, name").order("name"),
    crmOwners(),
    customFields("deal"),
  ]);
  if (!pipeline) notFound();
  const stages = (pipeline.pipeline_stages as { id: string; name: string; order_index: number; outcome: string }[]).sort((a, b) => a.order_index - b.order_index);
  const presetOrg = typeof sp.organization === "string" ? sp.organization : "";
  const presetContact = typeof sp.contact === "string" ? sp.contact : "";

  const values: DealValues = deal
    ? {
        pipeline_id: deal.pipeline_id,
        stage_id: deal.stage_id,
        title: deal.title,
        organization_id: deal.organization_id ?? "",
        contact_id: deal.contact_id ?? "",
        owner_id: deal.owner_id ?? "",
        value_rupees: String(Math.round(deal.value_paise / 100)),
        expected_close: deal.expected_close ?? "",
        source: deal.source ?? "",
        campaign_id: deal.campaign_id ?? "",
        lost_reason: deal.lost_reason ?? "",
        custom: deal.custom ?? {},
      }
    : {
        pipeline_id: pipeline.id,
        stage_id: stages[0]?.id ?? "",
        title: "",
        organization_id: presetOrg,
        contact_id: presetContact,
        owner_id: staff.id,
        value_rupees: "0",
        expected_close: "",
        source: "manual",
        campaign_id: "",
        lost_reason: "",
        custom: {},
      };

  const form = (
    <DealForm
      id={isNew ? null : id}
      initial={values}
      stages={stages}
      orgs={orgs ?? []}
      contacts={contacts ?? []}
      owners={owners}
      campaigns={campaigns ?? []}
      fields={fields}
      canWrite={canWrite}
    />
  );

  if (isNew) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="New deal" crumbs={[{ href: `/hq/crm/pipeline/${pipelineSlug}`, label: `${pipeline.name} pipeline` }]} />
        <Card>{form}</Card>
      </div>
    );
  }

  const acts = (deal!.activities ?? []) as { due_at: string | null; done_at: string | null }[];
  const hasNext = acts.some((a) => !a.done_at && a.due_at);
  const stale = staleReason(deal!, hasNext, pipeline.stale_days, new Date());
  const org = deal!.organizations as { id: string; name: string } | null;
  const contact = deal!.contacts as { id: string; name: string } | null;
  const family = deal!.families as { parent_id: string; parents: { name: string | null; email: string | null } | null } | null;
  const events = await timeline({ dealIds: [id] });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={deal!.title}
        crumbs={[{ href: `/hq/crm/pipeline/${pipelineSlug}`, label: `${pipeline.name} pipeline` }]}
        description={`${rupees(deal!.value_paise)} · ${stages.find((s) => s.id === deal!.stage_id)?.name}`}
        actions={<StatusBadge status={deal!.status} />}
      />
      {stale && deal!.status === "open" && (
        <div className="mb-4">
          <Notice tone="warn">
            Stale: {STALE_LABEL[stale].toLowerCase()}. {stale === "no_next_activity" ? "Schedule the next step below." : `No stage change in ${pipeline.stale_days}+ days.`}
          </Notice>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card title="Details">{form}</Card>
          <Card title="Linked records">
            <ul className="space-y-1 text-sm">
              {org && (
                <li>
                  Organization:{" "}
                  <Link href={`/hq/crm/organizations/${org.id}`} className="text-violet-700 hover:underline">
                    {org.name}
                  </Link>
                </li>
              )}
              {contact && (
                <li>
                  Contact:{" "}
                  <Link href={`/hq/crm/contacts/${contact.id}`} className="text-violet-700 hover:underline">
                    {contact.name}
                  </Link>
                </li>
              )}
              {family && (
                <li>
                  Family:{" "}
                  <Link href={`/hq/crm/families/${family.parent_id}`} className="text-violet-700 hover:underline">
                    {family.parents?.name ?? family.parents?.email ?? "Family"}
                  </Link>
                </li>
              )}
              {!org && !contact && !family && <li className="text-[#6b6778]">Nothing linked yet.</li>}
            </ul>
          </Card>
        </div>
        <div className="space-y-4">
          {canWrite && (
            <Card title="Log or schedule">
              <ActivityComposer
                links={{ deal_id: id, ...(org ? { organization_id: org.id } : {}), ...(contact ? { contact_id: contact.id } : {}), ...(family ? { family_parent_id: family.parent_id } : {}) }}
                owners={owners}
                defaultOwner={deal!.owner_id ?? staff.id}
              />
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
