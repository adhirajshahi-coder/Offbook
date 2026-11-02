import type { Metadata } from "next";
import Link from "next/link";
import { FaqList, PageHero, PriceCard, Section } from "@/components/marketing/blocks";
import { getPlan, refundWindowDays } from "@/lib/public-data";
import { formatRupees } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "One yearly plan per child, everything included. No auto-renewal, easy refunds.",
};

export default async function PricingPage() {
  const [plan, refundDays] = await Promise.all([getPlan(), refundWindowDays()]);
  const perDay = plan ? formatRupees(Math.round(plan.price_paise / plan.duration_days / 100) * 100) : null;

  return (
    <>
      <PageHero
        title="One plan, everything included"
        intro={
          perDay
            ? `About ${perDay} a day per child. No extras, no upsells, no in-app purchases.`
            : "No extras, no upsells, no in-app purchases."
        }
      />
      <Section title="The Offbook year">
        <div className="grid items-start gap-8 md:grid-cols-[minmax(0,420px)_1fr]">
          <PriceCard plan={plan} />
          <div className="space-y-4 text-lg">
            <p>
              <span className="font-semibold">School code or coupon?</span> Enter it at checkout. If you
              have both, you get whichever saves you more.
            </p>
            <p>
              <span className="font-semibold">More than one child?</span> Each child has their own
              profile and yearly plan.
            </p>
            <p>
              <span className="font-semibold">Changed your mind?</span> Full refund within {refundDays} days
              of paying, from the Billing page.{" "}
              <Link href="/refunds" className="text-violet-600 underline underline-offset-4">
                Refund policy
              </Link>
            </p>
            {plan && (
              <p className="text-base text-muted">
                {plan.tax_inclusive
                  ? `Prices include GST at ${plan.tax_rate}%. Your invoice shows the GST amount.`
                  : `GST at ${plan.tax_rate}% is added at checkout and shown on your invoice.`}
              </p>
            )}
          </div>
        </div>
      </Section>
      <Section title="Pricing questions" className="bg-[#fafafb]">
        <FaqList
          items={[
            { q: "Will I be charged again next year?", a: "No. It's a single payment. We remind you 14 and 7 days before your year ends, and you choose whether to renew." },
            { q: "How do I pay?", a: "UPI, cards and netbanking through Razorpay, India's standard payment gateway. We never see or store your card details." },
            { q: "Do I get an invoice?", a: "Yes. It's emailed to you and always available in the Parent Zone under Billing." },
          ]}
        />
      </Section>
    </>
  );
}
