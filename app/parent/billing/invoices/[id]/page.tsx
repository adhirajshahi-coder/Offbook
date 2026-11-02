import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/brand/Logo";
import { requireParent } from "@/lib/auth";
import { formatDate } from "@/lib/parent-data";
import { formatRupees } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Invoice" };

type Line = { label: string; amount_paise: number };

// GST details (GSTIN, HSN/SAC, address) are placeholders until a CA confirms
// the tax treatment (PRD §11 [VERIFY]). Values come from env, never code.
export default async function InvoicePage({ params }: PageProps<"/parent/billing/invoices/[id]">) {
  const parent = await requireParent();
  const { id } = await params;
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("number, amount_paise, tax_paise, tax_rate, tax_inclusive, lines, issued_at, subscriptions(starts_at, ends_at, students(display_name))")
    .eq("id", id)
    .maybeSingle();
  if (!inv) notFound();

  const sub = inv.subscriptions as unknown as {
    starts_at: string;
    ends_at: string;
    students: { display_name: string } | null;
  } | null;
  const lines = (inv.lines as Line[]).filter((l) => l.amount_paise !== 0);
  const gstin = process.env.INVOICE_GSTIN;

  return (
    <article className="mx-auto max-w-2xl rounded-[14px] border border-line bg-white p-8 print:border-0 print:p-0">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Wordmark className="h-7 w-auto" />
          <p className="mt-2 text-sm text-muted">{process.env.INVOICE_LEGAL_NAME ?? "Offbook"}</p>
          {gstin && <p className="text-sm text-muted">GSTIN {gstin}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-black">Tax invoice</p>
          <p className="text-sm">{inv.number}</p>
          <p className="text-sm text-muted">{formatDate(inv.issued_at)}</p>
        </div>
      </header>

      <section className="mt-8 text-sm">
        <p className="font-semibold">Billed to</p>
        <p>{parent.name ?? parent.email}</p>
        {parent.email && <p className="text-muted">{parent.email}</p>}
      </section>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="py-2 font-semibold">Description</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.label} className="border-b border-line">
              <td className="py-2">
                {l.label === "Discount" ? "Discount" : `${l.label}${sub?.students ? ` for ${sub.students.display_name}` : ""}`}
                {l.label !== "Discount" && sub && (
                  <span className="block text-muted">
                    {formatDate(sub.starts_at)} to {formatDate(sub.ends_at)}
                  </span>
                )}
              </td>
              <td className="py-2 text-right">
                {l.amount_paise < 0 ? `−${formatRupees(-l.amount_paise)}` : formatRupees(l.amount_paise)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-3 text-muted">
              {inv.tax_inclusive ? "Includes" : "Of which"} GST at {Number(inv.tax_rate)}%
            </td>
            <td className="pt-3 text-right text-muted">{formatRupees(inv.tax_paise)}</td>
          </tr>
          <tr>
            <td className="pt-2 text-base font-bold">Total paid</td>
            <td className="pt-2 text-right text-base font-bold">{formatRupees(inv.amount_paise)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="mt-10 flex items-center justify-between gap-3 print:hidden">
        <p className="text-xs text-muted">Paid via Razorpay. Keep this for your records.</p>
        <PrintButton />
      </footer>
    </article>
  );
}
