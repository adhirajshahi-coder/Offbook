import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, hqButton, PageHeader } from "@/components/hq/ui";
import { crmStaff, crmOwners } from "@/lib/crm/data";
import { pickParams, savedViews } from "@/lib/crm/views";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SavedViews } from "../SavedViews";
import { RunAutomationsButton } from "../RunAutomationsButton";

export const metadata: Metadata = { title: "Families" };

const KEYS = ["q", "risk", "plan", "owner"] as const;

export default async function FamiliesPage({ searchParams }: PageProps<"/hq/crm/families">) {
  const { staff, canWrite } = await crmStaff();
  const f = pickParams(await searchParams, KEYS);
  const supabase = await createClient();
  let q = supabase.from("families").select("parent_id, owner_id, at_risk, at_risk_since, created_at").order("created_at", { ascending: false }).limit(500);
  if (f.risk === "yes") q = q.eq("at_risk", true);
  if (f.owner) q = f.owner === "none" ? q.is("owner_id", null) : q.eq("owner_id", f.owner);
  const [{ data: fams }, owners, views] = await Promise.all([q, crmOwners(), savedViews("family", staff.id)]);
  const ids = (fams ?? []).map((x) => x.parent_id);
  // Names and plan status only, via the service role after the CRM role check.
  const admin = createAdminClient();
  const [{ data: parents }, { data: kids }, { data: subs }] = ids.length
    ? await Promise.all([
        admin.from("parents").select("id, name, email").in("id", ids),
        admin.from("students").select("parent_id").in("parent_id", ids).is("deleted_at", null),
        admin.from("subscriptions").select("parent_id, status, ends_at").in("parent_id", ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const parent = new Map((parents ?? []).map((p) => [p.id, p]));
  const ownerName = new Map(owners.map((o) => [o.id, o.name]));
  const now = new Date().toISOString();
  let rows = (fams ?? []).map((x) => {
    const p = parent.get(x.parent_id);
    const mine = (subs ?? []).filter((s) => s.parent_id === x.parent_id);
    const active = mine.filter((s) => s.status === "active" && s.ends_at && s.ends_at > now);
    return {
      ...x,
      name: p?.name ?? p?.email ?? "Parent",
      email: p?.email ?? "",
      children: (kids ?? []).filter((k) => k.parent_id === x.parent_id).length,
      plan: active.length ? "active" : mine.some((s) => s.status === "active" || s.status === "expired") ? "lapsed" : "none",
    };
  });
  if (f.plan) rows = rows.filter((r) => r.plan === f.plan);
  if (f.q) {
    const t = f.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(t) || r.email.toLowerCase().includes(t));
  }

  return (
    <div className="max-w-6xl">
      <PageHeader title="Families" description="Paying parents and their children, with product usage and at-risk flags." actions={canWrite && <RunAutomationsButton />} />
      <SavedViews object="family" basePath="/hq/crm/families" views={views} current={f} />
      <form className="mb-3 flex flex-wrap items-end gap-2 text-xs" action="/hq/crm/families">
        <input name="q" defaultValue={f.q} placeholder="Search parent name or email" className="h-8 w-60 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Search" />
        <select name="plan" defaultValue={f.plan} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Plan">
          <option value="">Any plan</option>
          <option value="active">Active plan</option>
          <option value="lapsed">Lapsed</option>
          <option value="none">Never paid</option>
        </select>
        <select name="risk" defaultValue={f.risk} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="At risk">
          <option value="">Everyone</option>
          <option value="yes">At risk</option>
        </select>
        <select name="owner" defaultValue={f.owner} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Owner">
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button className={hqButton("secondary", "h-8")}>Filter</button>
      </form>
      <Card>
        {rows.length === 0 ? (
          <Empty>No families match. New sign-ups appear after the daily sync.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                {["Parent", "Children", "Plan", "At risk", "Owner"].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.parent_id} className="border-t border-[#eeecf2]">
                  <td className="py-2 pr-3">
                    <Link href={`/hq/crm/families/${r.parent_id}`} className="font-semibold text-violet-700 hover:underline">
                      {r.name}
                    </Link>
                    <span className="block text-xs text-[#6b6778]">{r.email}</span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{r.children}</td>
                  <td className="py-2 pr-3">{r.plan === "active" ? "Active" : r.plan === "lapsed" ? "Lapsed" : "—"}</td>
                  <td className="py-2 pr-3">{r.at_risk ? <span className="font-semibold text-[#8a5a00]">Inactive 7+ days</span> : "—"}</td>
                  <td className="py-2 text-xs">{r.owner_id ? (ownerName.get(r.owner_id) ?? "—") : "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
