import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import {
  courseCompleteEmail,
  inactiveNudgeEmail,
  receiptEmail,
  refundDecisionEmail,
  renewalReminderEmail,
  reviewAlertEmail,
  weeklySummaryEmail,
  type Rendered,
} from "@/lib/email-templates";

export const metadata: Metadata = { title: "Email templates" };

/** Every email Offbook sends, rendered with sample data, for review before launch. */
export default async function EmailsPage() {
  await requireStaff([]);
  const samples: [string, string, Rendered][] = [
    ["Payment receipt", "After a successful payment", receiptEmail({ parentName: "Priya Sharma", childName: "Riya", invoiceNumber: "OB-2026-0042", amount: "₹6,000", tax: "₹915", endsOn: "10 November 2027", invoiceUrl: "#", refundDays: 7 })],
    ["Weekly summary", "Mondays, if weekly updates are on and something happened", weeklySummaryEmail({ parentName: "Priya Sharma", weekOf: "2 November", children: [{ name: "Riya", lessons: 4, activeDays: 3, goal: 4, mastered: ["Budgeting"], askAbout: "Needs vs wants" }, { name: "Aarav", lessons: 1, activeDays: 1, goal: 3, mastered: [], askAbout: "Spotting a scam" }] })],
    ["Course completed", "When a reviewer approves a capstone", courseCompleteEmail({ parentName: "Priya Sharma", childName: "Riya", courseTitle: "Money Skills & Personal Finance", certificateUrl: "#", rank: "Explorer", xp: 1030 })],
    ["Renewal reminder", "14 and 7 days before a plan ends (can be turned off)", renewalReminderEmail({ parentName: "Priya Sharma", childName: "Riya", daysLeft: 14, endsOn: "24 November" })],
    ["Supportive nudge", "Once, after 7 days without learning", inactiveNudgeEmail({ parentName: "Priya Sharma", childNames: "Aarav" })],
    ["Refund approved", "When ops approves a refund", refundDecisionEmail({ parentName: "Priya Sharma", childName: "Riya", approved: true, amount: "₹6,000" })],
    ["Refund declined", "When ops declines a refund", refundDecisionEmail({ parentName: "Priya Sharma", childName: "Riya", approved: false, amount: "₹6,000", note: "The refund window for this plan closed on 17 November." })],
    ["Review SLA alert (staff)", "When work waits over 36 hours", reviewAlertEmail({ count: 3, hours: 36 })],
  ];

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader title="Email templates" crumbs={[{ href: "/hq/settings/system", label: "System" }]} description="Sample data only. Every email shares one layout with a footer that says why it was sent and links to settings, refunds and privacy." />
      {!process.env.RESEND_API_KEY && <p className="text-sm text-[#8a5a00]">RESEND_API_KEY isn&apos;t set, so emails are logged instead of sent.</p>}
      {samples.map(([name, when, r]) => (
        <Card key={name} title={`${name} · ${when}`}>
          <p className="mb-2 text-sm">
            <span className="text-[#6b6778]">Subject:</span> <strong>{r.subject}</strong>
          </p>
          <iframe title={`${name} preview`} srcDoc={r.html} className="h-[420px] w-full rounded-md border border-[#e4e2ea]" sandbox="" />
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-[#6b6778]">Plain-text version</summary>
            <pre className="mt-1 whitespace-pre-wrap rounded-md bg-[#f6f5f9] p-2">{r.text}</pre>
          </details>
        </Card>
      ))}
    </div>
  );
}
