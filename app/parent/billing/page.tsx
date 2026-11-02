import type { Metadata } from "next";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { RENEWAL_WINDOW_DAYS } from "@/lib/billing";
import { requireParent } from "@/lib/auth";
import { formatDate } from "@/lib/parent-data";
import { formatRupees } from "@/lib/pricing";
import { refundWindowDays } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { setRenewalReminders } from "./actions";
import { RefundForm } from "./RefundForm";

export const metadata: Metadata = { title: "Billing" };

type Sub = {
  id: string;
  student_id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  amount_paise: number;
  renewal_reminders: boolean;
  students: { display_name: string } | null;
  refunds: { status: string; created_at: string }[];
};

/** Time-dependent flags, worked out once per request outside render. */
function withTiming(subs: Sub[], refundDays: number) {
  const now = Date.now();
  return subs.map((s) => {
    const ends = s.ends_at ? new Date(s.ends_at).getTime() : 0;
    const live = s.status === "active" && ends > now;
    return {
      ...s,
      live,
      canRenew: live && ends - now <= RENEWAL_WINDOW_DAYS * 86_400_000,
      inRefundWindow: Boolean(
        live && s.amount_paise > 0 && s.starts_at && now - new Date(s.starts_at).getTime() <= refundDays * 86_400_000,
      ),
    };
  });
}

const REFUND_STATUS: Record<string, string> = {
  requested: "Refund requested. We'll process it within 5 working days.",
  approved: "Refund approved. It's on its way to you.",
  processed: "Refunded.",
  rejected: "Refund declined. We've emailed you why.",
};

export default async function BillingPage() {
  await requireParent();
  const supabase = await createClient();
  const [{ data: subs }, { data: invoices }, refundDays] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, student_id, status, starts_at, ends_at, amount_paise, renewal_reminders, students(display_name), refunds(status, created_at)")
      .neq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("invoices").select("id, number, amount_paise, issued_at").order("issued_at", { ascending: false }),
    refundWindowDays(),
  ]);

  const plans = withTiming((subs ?? []) as unknown as Sub[], refundDays);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Billing</h1>
        <p className="mt-1 text-muted">
          One payment per child per year. We never charge you again automatically.
        </p>
      </div>

      <section className="rounded-[14px] border border-line bg-white p-5">
        <h2 className="text-xl font-black">Plans</h2>
        <ul className="mt-4 divide-y divide-line">
          {plans.map((s) => {
            const { live, canRenew, inRefundWindow } = s;
            const refund = s.refunds[0];
            return (
              <li key={s.id} className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.students?.display_name ?? "Profile removed"}</p>
                    <p className="text-sm text-muted">
                      {s.starts_at && s.ends_at
                        ? `${formatDate(s.starts_at)} to ${formatDate(s.ends_at)}`
                        : "Not started"}{" "}
                      · {formatRupees(s.amount_paise)}
                    </p>
                    <p className="mt-1 text-sm">
                      {refund
                        ? REFUND_STATUS[refund.status]
                        : live
                          ? "Active"
                          : s.status === "active"
                            ? "Ended"
                            : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </p>
                  </div>
                  {canRenew && (
                    <Link href={`/parent/checkout/${s.student_id}`} className={buttonClass("primary")}>
                      Renew for another year
                    </Link>
                  )}
                </div>
                {live && !refund && (
                  <form action={setRenewalReminders} className="flex flex-wrap items-center gap-3 text-sm">
                    <input type="hidden" name="subscriptionId" value={s.id} />
                    <input type="hidden" name="on" value={s.renewal_reminders ? "false" : "true"} />
                    <span className="text-muted">
                      Renewal reminders are {s.renewal_reminders ? "on (14 and 7 days before the end)" : "off"}.
                    </span>
                    <Button type="submit" variant="ghost" className="min-h-9 px-3 text-sm">
                      {s.renewal_reminders ? "Turn off" : "Turn on"}
                    </Button>
                  </form>
                )}
                {inRefundWindow && !refund && <RefundForm subscriptionId={s.id} days={refundDays} />}
              </li>
            );
          })}
          {plans.length === 0 && (
            <li className="py-4 text-muted">
              No plans yet. Start one from the{" "}
              <Link href="/parent" className="text-violet-600 underline underline-offset-4">
                Overview
              </Link>
              .
            </li>
          )}
        </ul>
        <p className="mt-2 text-sm text-muted">
          Cancelling: you don&apos;t need to do anything. Plans simply end after a year. To stop reminders, turn
          them off above.{" "}
          <Link href="/refunds" className="text-violet-600 underline underline-offset-4">
            Refund policy
          </Link>
        </p>
      </section>

      <section className="rounded-[14px] border border-line bg-white p-5">
        <h2 className="text-xl font-black">Invoices</h2>
        <ul className="mt-4 divide-y divide-line">
          {(invoices ?? []).map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{inv.number}</p>
                <p className="text-sm text-muted">
                  {formatDate(inv.issued_at)} · {formatRupees(inv.amount_paise)}
                </p>
              </div>
              <Link href={`/parent/billing/invoices/${inv.id}`} className={buttonClass("secondary")}>
                View
              </Link>
            </li>
          ))}
          {(invoices ?? []).length === 0 && <li className="py-3 text-muted">No invoices yet.</li>}
        </ul>
      </section>
    </div>
  );
}
