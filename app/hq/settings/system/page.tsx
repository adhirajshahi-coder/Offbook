import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { isMuxConfigured } from "@/lib/mux";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "System" };

const JOBS = [
  { key: "crm-daily", label: "CRM automations", path: "/api/cron/crm-daily", every: "Daily, about 09:00 IST", maxAgeH: 30 },
  { key: "league-rollover", label: "League rollover", path: "/api/cron/league-rollover", every: "Mondays, just after 00:00 IST", maxAgeH: 8 * 24 },
  { key: "weekly-summary", label: "Weekly parent summary", path: "/api/cron/weekly-summary", every: "Mondays, about 08:00 IST", maxAgeH: 8 * 24 },
];

const ago = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const h = (new Date().getTime() - new Date(iso).getTime()) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
};

/** Observability (PRD §17): integrations, webhook activity, scheduled jobs and recent errors. Admin only. */
export default async function SystemPage() {
  await requireStaff([]);
  const admin = createAdminClient();
  const supabase = await createClient();
  const started = new Date().getTime();
  const [dbCheck, { data: jobs }, { data: lastPaid }, { data: lastVideo }, { data: errors }, { count: errors24 }] = await Promise.all([
    admin.from("plans").select("id", { count: "exact", head: true }),
    admin.from("crm_state").select("key, value, updated_at").like("key", "cron:%"),
    admin.from("subscriptions").select("updated_at").not("razorpay_payment_id", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("videos").select("updated_at, status").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("error_events").select("id, source, message, path, route, kind, digest, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("error_events").select("id", { count: "exact", head: true }).gte("created_at", new Date(started - 86_400_000).toISOString()),
  ]);
  const dbMs = new Date().getTime() - started;
  const job = new Map((jobs ?? []).map((j) => [j.key.replace("cron:", ""), j]));

  const integrations = [
    { name: "Database (Supabase)", ok: !dbCheck.error, detail: dbCheck.error ? "Unreachable" : `Reachable · checks took ${dbMs} ms` },
    { name: "Payments (Razorpay)", ok: isRazorpayConfigured(), detail: isRazorpayConfigured() ? `Keys set · last webhook payment ${ago(lastPaid?.updated_at)}` : "Keys missing: checkout is off" },
    { name: "Video (Mux)", ok: isMuxConfigured(), detail: isMuxConfigured() ? `Keys set · last video update ${ago(lastVideo?.updated_at)}${lastVideo ? ` (${lastVideo.status})` : ""}` : "Keys missing: uploads are off" },
    { name: "Email (Resend)", ok: Boolean(process.env.RESEND_API_KEY), detail: process.env.RESEND_API_KEY ? `Sending as ${process.env.EMAIL_FROM ?? "Offbook <onboarding@resend.dev>"}` : "Key missing: emails are logged, not sent" },
    { name: "Scheduled jobs", ok: Boolean(process.env.CRON_SECRET), detail: process.env.CRON_SECRET ? "CRON_SECRET set" : "CRON_SECRET missing: cron routes refuse to run" },
  ];

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader title="System" description="Integrations, scheduled jobs and recent errors. Health check for uptime monitors: /api/health." actions={<Link href="/hq/settings/emails" className="text-sm font-semibold text-violet-700 hover:underline">Email templates →</Link>} />
      <Card title="Integrations">
        <ul className="divide-y divide-[#eeecf2] text-sm">
          {integrations.map((i) => (
            <li key={i.name} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-semibold">{i.name}</span>
                <span className="block text-xs text-[#6b6778]">{i.detail}</span>
              </span>
              <StatusBadge status={i.ok ? "active" : "paused"} />
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Scheduled jobs">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#6b6778]">
            <tr>
              <th className="pb-2 font-semibold">Job</th>
              <th className="pb-2 font-semibold">Schedule</th>
              <th className="pb-2 font-semibold">Last run</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {JOBS.map((j) => {
              const run = job.get(j.key);
              const at = (run?.value as { at?: string } | undefined)?.at;
              const late = !at || new Date().getTime() - new Date(at).getTime() > j.maxAgeH * 3_600_000;
              return (
                <tr key={j.key} className="border-t border-[#eeecf2] align-top">
                  <td className="py-2">
                    <span className="font-semibold">{j.label}</span>
                    <span className="block font-mono text-xs text-[#6b6778]">{j.path}</span>
                  </td>
                  <td className="py-2 text-xs">{j.every}</td>
                  <td className="py-2 text-xs">{ago(at)}</td>
                  <td className="py-2">
                    <StatusBadge status={late ? "pending" : "active"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-[#6b6778]">Each job needs `Authorization: Bearer $CRON_SECRET`. Jobs are idempotent: running one twice does no harm.</p>
      </Card>
      <Card title={`Recent errors (${errors24 ?? 0} in the last 24 h)`}>
        {(errors ?? []).length === 0 ? (
          <p className="text-sm text-[#6b6778]">No errors recorded.</p>
        ) : (
          <ul className="divide-y divide-[#eeecf2] text-sm">
            {errors!.map((e) => (
              <li key={e.id} className="py-2">
                <p className="font-mono text-xs">{e.message}</p>
                <p className="text-xs text-[#6b6778]">
                  {e.source} · {e.kind ?? "—"} · {e.route ?? e.path ?? "—"} · {ago(e.created_at)}
                  {e.digest ? ` · ref ${e.digest}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
