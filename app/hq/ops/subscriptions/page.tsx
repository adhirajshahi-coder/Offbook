import type { Metadata } from "next";
import { Card, Empty, Notice, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { formatRupees } from "@/lib/pricing";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";
import { MarkProcessed, RefundDecision } from "./SubscriptionControls";
import { SubscriptionsTable, type SubRow } from "./SubscriptionsTable";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  await requireStaff(["ops"]);
  const supabase = await createClient();
  const [{ data: refunds }, { data: subs }] = await Promise.all([
    supabase
      .from("refunds")
      .select("id, status, reason, amount_paise, created_at, subscriptions(starts_at, razorpay_payment_id, students(id, display_name), parents(email))")
      .in("status", ["requested", "approved"])
      .order("created_at"),
    supabase
      .from("subscriptions")
      .select("id, status, starts_at, ends_at, amount_paise, renewal_reminders, student_id, students(display_name), parents(email), coupons(code), schools(name)")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const rows: SubRow[] = (subs ?? []).map((s) => ({
    id: s.id,
    studentId: s.student_id,
    student: (s.students as unknown as { display_name: string } | null)?.display_name ?? "Removed",
    parent: (s.parents as unknown as { email: string | null } | null)?.email ?? "",
    status: s.status,
    starts: s.starts_at?.slice(0, 10) ?? "",
    ends: s.ends_at?.slice(0, 10) ?? "",
    amount: formatRupees(s.amount_paise),
    code: (s.coupons as unknown as { code: string } | null)?.code ?? (s.schools as unknown as { name: string } | null)?.name ?? "",
    reminders: s.renewal_reminders ? "On" : "Off",
  }));

  const requested = (refunds ?? []).filter((r) => r.status === "requested");
  const approved = (refunds ?? []).filter((r) => r.status === "approved");

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader title="Subscriptions" crumbs={[{ href: "/hq/ops", label: "Operations" }]} description="Plans, refunds and extensions. Every change is written to the audit log." />
      {!isRazorpayConfigured() && <Notice tone="warn">Razorpay keys aren&apos;t set, so approved refunds must be paid manually and then marked refunded.</Notice>}

      <Card title={`Refund requests (${requested.length})`}>
        {requested.length === 0 ? (
          <Empty>No refund requests waiting.</Empty>
        ) : (
          <ul className="divide-y divide-[#eeecf2]">
            {requested.map((r) => {
              const sub = r.subscriptions as unknown as { starts_at: string; razorpay_payment_id: string | null; students: { id: string; display_name: string } | null; parents: { email: string | null } | null };
              const daysIn = Math.floor((new Date(r.created_at).getTime() - new Date(sub.starts_at).getTime()) / 86_400_000);
              return (
                <li key={r.id} className="grid gap-3 py-3 md:grid-cols-[1fr_340px]">
                  <div className="text-sm">
                    <p className="font-semibold">
                      {sub.students?.display_name} · {formatRupees(r.amount_paise ?? 0)}
                    </p>
                    <p className="text-[#6b6778]">
                      {sub.parents?.email} · asked {r.created_at.slice(0, 10)}, {daysIn} days after paying
                    </p>
                    {r.reason && <p className="mt-1">&ldquo;{r.reason}&rdquo;</p>}
                  </div>
                  <RefundDecision refundId={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {approved.length > 0 && (
        <Card title="Approved, waiting to be paid manually">
          <ul className="divide-y divide-[#eeecf2]">
            {approved.map((r) => {
              const sub = r.subscriptions as unknown as { students: { display_name: string } | null; parents: { email: string | null } | null };
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {sub.students?.display_name} · {formatRupees(r.amount_paise ?? 0)} · {sub.parents?.email} <StatusBadge status="approved" />
                  </span>
                  <MarkProcessed refundId={r.id} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <SubscriptionsTable rows={rows} />
    </div>
  );
}
