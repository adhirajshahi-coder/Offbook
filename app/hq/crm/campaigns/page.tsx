import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/hq/ui";
import { crmStaff, rupees } from "@/lib/crm/data";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CampaignForm, ReferralForm } from "./Forms";

export const metadata: Metadata = { title: "Campaigns and referrals" };

const KIND: Record<string, string> = { creator: "Creator collab", school_outreach: "School outreach", webinar: "Webinar", ads: "Ads", event: "Event", other: "Other" };

/** Marketing views (PRD §12.5): campaigns with spend, leads, paid and costs; referral and creator codes with payouts. */
export default async function CampaignsPage() {
  const { canWrite } = await crmStaff();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: campaigns }, { data: codes }, { data: contacts }, { data: leadRows }, { data: parents }, { data: subs }] = await Promise.all([
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("referral_codes").select("*, contacts(name)").order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, name").in("kind", ["creator", "partner", "other", "parent_lead"]).order("name").limit(500),
    supabase.from("contacts").select("campaign_id").not("campaign_id", "is", null),
    // Attribution needs sign-up and payment counts; counts only.
    admin.from("parents").select("id, signup_utm, referral_code_id"),
    admin.from("subscriptions").select("parent_id, status, amount_paise, referral_code_id").in("status", ["active", "expired"]),
  ]);

  const paidByParent = new Map<string, number>();
  for (const s of subs ?? []) paidByParent.set(s.parent_id, (paidByParent.get(s.parent_id) ?? 0) + s.amount_paise);

  const campaignRows = (campaigns ?? []).map((c) => {
    const leads = (leadRows ?? []).filter((l) => l.campaign_id === c.id).length;
    const signups = (parents ?? []).filter((p) => c.utm_campaign && (p.signup_utm as Record<string, string>)?.utm_campaign === c.utm_campaign);
    const paid = signups.filter((p) => paidByParent.has(p.id));
    const revenue = paid.reduce((n, p) => n + (paidByParent.get(p.id) ?? 0), 0);
    return { ...c, leads, signups: signups.length, paid: paid.length, revenue };
  });
  const codeRows = (codes ?? []).map((r) => {
    const signups = (parents ?? []).filter((p) => p.referral_code_id === r.id).length;
    const paidSubs = (subs ?? []).filter((s) => s.referral_code_id === r.id);
    const revenue = paidSubs.reduce((n, s) => n + s.amount_paise, 0);
    const owed = Math.max(0, Math.round((revenue * r.payout_percent) / 100) - r.paid_out_paise);
    return { ...r, signups, paid: paidSubs.length, revenue, owed };
  });
  const campaignOpts = (campaigns ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader title="Campaigns and referrals" description="Spend is entered by hand. Sign-ups are matched by utm_campaign; referral sign-ups by the code a family joined with." />

      <Card title="Campaigns" actions={canWrite && <CampaignForm label="New campaign" initial={{ id: null, name: "", kind: "creator", utm_campaign: "", spend_rupees: "0", starts_on: "", ends_on: "" }} />}>
        {campaignRows.length === 0 ? (
          <p className="text-sm text-[#6b6778]">No campaigns yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                {["Campaign", "Spend", "Leads", "Sign-ups", "Paid", "Revenue", "Cost / lead", "Cost / paid student", ""].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaignRows.map((c) => (
                <tr key={c.id} className="border-t border-[#eeecf2] align-top">
                  <td className="py-2 pr-3">
                    <span className="font-semibold">{c.name}</span>
                    <span className="block text-xs text-[#6b6778]">
                      {KIND[c.kind]}
                      {c.utm_campaign && ` · utm_campaign=${c.utm_campaign}`}
                    </span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{rupees(c.spend_paise)}</td>
                  <td className="py-2 pr-3 tabular-nums">{c.leads}</td>
                  <td className="py-2 pr-3 tabular-nums">{c.signups}</td>
                  <td className="py-2 pr-3 tabular-nums">{c.paid}</td>
                  <td className="py-2 pr-3 tabular-nums">{rupees(c.revenue)}</td>
                  <td className="py-2 pr-3 tabular-nums">{c.leads + c.signups ? rupees(c.spend_paise / (c.leads + c.signups)) : "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{c.paid ? rupees(c.spend_paise / c.paid) : "—"}</td>
                  <td className="py-2">
                    {canWrite && (
                      <CampaignForm
                        label="Edit"
                        initial={{ id: c.id, name: c.name, kind: c.kind, utm_campaign: c.utm_campaign ?? "", spend_rupees: String(Math.round(c.spend_paise / 100)), starts_on: c.starts_on ?? "", ends_on: c.ends_on ?? "" }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        title="Referral and creator codes"
        actions={canWrite && <ReferralForm label="New code" contacts={contacts ?? []} campaigns={campaignOpts} initial={{ id: null, code: "", contact_id: "", campaign_id: "", payout_percent: "10", paid_out_rupees: "0", active: true, note: "" }} />}
      >
        {codeRows.length === 0 ? (
          <p className="text-sm text-[#6b6778]">No codes yet. Families join with a code via a link like offbook.in/?ref=CODE.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                {["Code", "Owner", "Sign-ups", "Paid", "Revenue", "Payout", "Owed", ""].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codeRows.map((r) => (
                <tr key={r.id} className="border-t border-[#eeecf2] align-top">
                  <td className="py-2 pr-3 font-mono font-semibold">
                    {r.code}
                    {!r.active && <span className="ml-1 font-sans text-xs font-normal text-[#6b6778]">(off)</span>}
                  </td>
                  <td className="py-2 pr-3">{(r.contacts as { name: string } | null)?.name ?? "—"}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.signups}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.paid}</td>
                  <td className="py-2 pr-3 tabular-nums">{rupees(r.revenue)}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {r.payout_percent}% <span className="text-xs text-[#6b6778]">({rupees(r.paid_out_paise)} paid)</span>
                  </td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{rupees(r.owed)}</td>
                  <td className="py-2">
                    {canWrite && (
                      <ReferralForm
                        label="Edit"
                        contacts={contacts ?? []}
                        campaigns={campaignOpts}
                        initial={{ id: r.id, code: r.code, contact_id: r.contact_id ?? "", campaign_id: r.campaign_id ?? "", payout_percent: String(r.payout_percent), paid_out_rupees: String(Math.round(r.paid_out_paise / 100)), active: r.active, note: r.note ?? "" }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-[#6b6778]">Payouts are tracked by hand in v1: pay the creator, then record it under Paid out.</p>
      </Card>
    </div>
  );
}
