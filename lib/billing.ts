import "server-only";
import { sendEmail } from "@/lib/email";
import { receiptEmail } from "@/lib/email-templates";
import { siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/parent-data";
import { formatRupees, normaliseCode, quote, type Coupon, type Quote } from "@/lib/pricing";
import { refundWindowDays } from "@/lib/public-data";
import { createAdminClient } from "@/lib/supabase/server";

/** Renewal opens this many days before the current year ends. */
export const RENEWAL_WINDOW_DAYS = 30;

export type Discount = {
  coupon: (Coupon & { id: string; code: string }) | null;
  school: { id: string; name: string; discount_percent: number } | null;
  label: string | null;
  error?: string;
};

/**
 * A code can be a coupon or a school code. Validated with the service role
 * because coupons and schools aren't readable by families.
 */
export async function resolveCode(raw: string): Promise<Discount> {
  const code = normaliseCode(raw);
  if (!code) return { coupon: null, school: null, label: null };
  const db = createAdminClient();

  const { data: coupon } = await db
    .from("coupons")
    .select("id, code, kind, value, max_uses, used_count, valid_from, valid_to, active")
    .eq("code", code)
    .maybeSingle();
  if (coupon) {
    const now = Date.now();
    const valid =
      coupon.active &&
      (!coupon.valid_from || new Date(coupon.valid_from).getTime() <= now) &&
      (!coupon.valid_to || new Date(coupon.valid_to).getTime() > now) &&
      (coupon.max_uses == null || coupon.used_count < coupon.max_uses);
    if (!valid) return { coupon: null, school: null, label: null, error: "That code has expired or been used up." };
    const label = coupon.kind === "percent" ? `${coupon.value}% off with ${code}` : `${formatRupees(coupon.value)} off with ${code}`;
    return { coupon: { id: coupon.id, code, kind: coupon.kind, value: coupon.value }, school: null, label };
  }

  const { data: school } = await db
    .from("schools")
    .select("id, name, discount_percent, status")
    .eq("school_code", code)
    .maybeSingle();
  if (school && school.status === "active") {
    return {
      coupon: null,
      school: { id: school.id, name: school.name, discount_percent: school.discount_percent },
      label: school.discount_percent
        ? `${school.name}: ${school.discount_percent}% school price`
        : `Joining with ${school.name}`,
    };
  }

  return { coupon: null, school: null, label: null, error: "We don't recognise that code. Check it and try again." };
}

export async function getActivePlan() {
  const db = createAdminClient();
  const { data } = await db
    .from("plans")
    .select("id, name, price_paise, tax_rate, tax_inclusive, duration_days")
    .eq("slug", "annual")
    .eq("active", true)
    .single();
  return data;
}

export function quoteWith(
  plan: { price_paise: number; tax_rate: number; tax_inclusive: boolean },
  discount: Discount,
): Quote {
  return quote(plan, { coupon: discount.coupon, schoolDiscountPercent: discount.school?.discount_percent ?? 0 });
}

/**
 * Called by both the checkout success handler and the Razorpay webhook.
 * The DB function is idempotent, so the receipt goes out exactly once.
 */
export async function finalizePaidOrder(orderId: string, paymentId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: subscriptionId, error } = await db.rpc("activate_subscription", {
    p_order_id: orderId,
    p_payment_id: paymentId,
  });
  if (error) throw new Error(`activate_subscription failed: ${error.message}`);
  if (!subscriptionId) return false;

  const { data: sub } = await db
    .from("subscriptions")
    .select("ends_at, students(display_name), parents(name, email), invoices(id, number, amount_paise, tax_paise)")
    .eq("id", subscriptionId)
    .single();
  const student = sub?.students as unknown as { display_name: string } | null;
  const parent = sub?.parents as unknown as { name: string | null; email: string | null } | null;
  const invoice = (sub?.invoices as unknown as { id: string; number: string; amount_paise: number; tax_paise: number }[] | null)?.[0];

  if (sub && student && parent?.email && invoice) {
    const email = receiptEmail({
      parentName: parent.name,
      childName: student.display_name,
      invoiceNumber: invoice.number,
      amount: formatRupees(invoice.amount_paise),
      tax: formatRupees(invoice.tax_paise),
      endsOn: formatDate(sub.ends_at as string),
      invoiceUrl: `${siteUrl}/parent/billing/invoices/${invoice.id}`,
      refundDays: await refundWindowDays(),
    });
    await sendEmail({ to: parent.email, ...email });
  }
  return true;
}
