import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/hq/ui";
import { crmStaff, rupees } from "@/lib/crm/data";
import { STALE_LABEL, staleReason } from "@/lib/crm/rules";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { CompleteButton } from "./ActivityComposer";
import { fmtWhen } from "./Timeline";

export const metadata: Metadata = { title: "My day" };

type Act = {
  id: string;
  type: string;
  subject: string;
  due_at: string;
  deals: { id: string; title: string } | null;
  contacts: { id: string; name: string } | null;
  organizations: { id: string; name: string } | null;
  family_parent_id: string | null;
};

function istDayEnd(now: Date) {
  const ymd = new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  return { start: `${ymd}T00:00:00+05:30`, end: `${ymd}T23:59:59+05:30` };
}

/** Sales home (PRD §12.4): tasks due, stale deals, new leads, meetings today. */
export default async function MyDayPage() {
  const { staff, canWrite } = await crmStaff();
  const supabase = await createClient();
  const now = new Date();
  const { start, end } = istDayEnd(now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [{ data: due }, { data: meetings }, { data: myDeals }, { data: leads }, { data: pipelines }] = await Promise.all([
    supabase
      .from("activities")
      .select("id, type, subject, due_at, family_parent_id, deals(id, title), contacts(id, name), organizations(id, name)")
      .eq("owner_id", staff.id)
      .is("done_at", null)
      .neq("type", "meeting")
      .lte("due_at", end)
      .order("due_at")
      .limit(50),
    supabase
      .from("activities")
      .select("id, type, subject, due_at, family_parent_id, deals(id, title), contacts(id, name), organizations(id, name)")
      .eq("owner_id", staff.id)
      .eq("type", "meeting")
      .gte("due_at", start)
      .lte("due_at", end)
      .order("due_at"),
    supabase.from("deals").select("id, title, status, value_paise, stage_changed_at, pipeline_id, activities(due_at, done_at)").eq("owner_id", staff.id).eq("status", "open").limit(300),
    supabase.from("contacts").select("id, name, source, created_at, organizations(name)").eq("owner_id", staff.id).gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(20),
    supabase.from("pipelines").select("id, slug, name, stale_days").order("order_index"),
  ]);
  const staleDays = new Map((pipelines ?? []).map((p) => [p.id, p.stale_days]));
  const stale = (myDeals ?? [])
    .map((d) => {
      const acts = (d.activities ?? []) as { due_at: string | null; done_at: string | null }[];
      return { ...d, reason: staleReason(d, acts.some((a) => !a.done_at && a.due_at), staleDays.get(d.pipeline_id) ?? 14, now) };
    })
    .filter((d) => d.reason);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`My day, ${staff.name.split(" ")[0]}`}
        description={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}
        actions={(pipelines ?? []).map((p) => (
          <Link key={p.id} href={`/hq/crm/pipeline/${p.slug}`} className="inline-flex h-9 items-center rounded-md border border-[#d9d6e2] bg-white px-3 text-sm font-semibold hover:bg-[#f4f2f8]">
            {p.name} pipeline
          </Link>
        ))}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Tasks due (${(due ?? []).length})`}>
          <ActList items={(due ?? []) as unknown as Act[]} now={now} canWrite={canWrite} empty="Nothing due today. Nice." />
        </Card>
        <Card title={`Meetings today (${(meetings ?? []).length})`}>
          <ActList items={(meetings ?? []) as unknown as Act[]} now={now} canWrite={canWrite} empty="No meetings today." />
        </Card>
        <Card title={`Stale deals (${stale.length})`}>
          {stale.length === 0 ? (
            <p className="text-sm text-[#6b6778]">Every open deal has a next step.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {stale.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <Link href={`/hq/crm/deals/${d.id}`} className="font-semibold text-violet-700 hover:underline">
                    {d.title}
                  </Link>
                  <span className="text-xs text-[#8a5a00]">
                    {STALE_LABEL[d.reason!]} · {rupees(d.value_paise)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`New leads this week (${(leads ?? []).length})`}>
          {(leads ?? []).length === 0 ? (
            <p className="text-sm text-[#6b6778]">No new leads assigned to you.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {leads!.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span>
                    <Link href={`/hq/crm/contacts/${l.id}`} className="font-semibold text-violet-700 hover:underline">
                      {l.name}
                    </Link>
                    {(l.organizations as unknown as { name: string } | null)?.name && <span className="text-xs text-[#6b6778]"> · {(l.organizations as unknown as { name: string }).name}</span>}
                  </span>
                  <span className="text-xs text-[#6b6778]">
                    {l.source ?? "—"} · {fmtWhen(l.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ActList({ items, now, canWrite, empty }: { items: Act[]; now: Date; canWrite: boolean; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-[#6b6778]">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((a) => {
        const overdue = new Date(a.due_at) < now;
        const link = a.deals
          ? { href: `/hq/crm/deals/${a.deals.id}`, label: a.deals.title }
          : a.organizations
            ? { href: `/hq/crm/organizations/${a.organizations.id}`, label: a.organizations.name }
            : a.contacts
              ? { href: `/hq/crm/contacts/${a.contacts.id}`, label: a.contacts.name }
              : a.family_parent_id
                ? { href: `/hq/crm/families/${a.family_parent_id}`, label: "Family" }
                : null;
        return (
          <li key={a.id} className="flex items-start justify-between gap-2">
            <span>
              <span className="font-semibold">{a.subject}</span>
              {link && (
                <Link href={link.href} className="block text-xs text-violet-700 hover:underline">
                  {link.label}
                </Link>
              )}
              <span className={cn("block text-xs", overdue ? "font-semibold text-[#b4233f]" : "text-[#6b6778]")}>
                {overdue ? "Overdue · " : ""}
                {fmtWhen(a.due_at)}
              </span>
            </span>
            {canWrite && <CompleteButton id={a.id} done={false} />}
          </li>
        );
      })}
    </ul>
  );
}
