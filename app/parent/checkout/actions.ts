"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { RENEWAL_WINDOW_DAYS, finalizePaidOrder, getActivePlan, quoteWith, resolveCode } from "@/lib/billing";
import { requireParent } from "@/lib/auth";
import { formatRupees } from "@/lib/pricing";
import { createOrder, isRazorpayConfigured, razorpayKeyId, verifyPaymentSignature } from "@/lib/razorpay";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type QuoteView = {
  total: string;
  list: string;
  discount: string | null;
  tax: string;
  taxNote: string;
  label: string | null;
  error?: string;
  code: string;
};

export async function previewQuote(code: string): Promise<QuoteView> {
  await requireParent();
  const plan = await getActivePlan();
  if (!plan) throw new Error("No active plan");
  const discount = await resolveCode(code);
  const q = quoteWith(plan, discount);
  return {
    total: formatRupees(q.totalPaise),
    list: formatRupees(q.listPricePaise),
    discount: q.discountPaise ? formatRupees(q.discountPaise) : null,
    tax: formatRupees(q.taxPaise),
    taxNote: q.taxInclusive ? `Includes ${q.taxRate}% GST` : `Includes ${q.taxRate}% GST added on top`,
    label: discount.label,
    error: discount.error,
    code: discount.error ? "" : code,
  };
}

export type StartResult =
  | { mode: "razorpay"; orderId: string; keyId: string; amountPaise: number; childName: string; email: string | null }
  | { mode: "done" }
  | { mode: "error"; error: string };

export async function startCheckout(studentId: string, code: string): Promise<StartResult> {
  const parent = await requireParent();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("students")
    .select("id, display_name, status")
    .eq("id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!child) return { mode: "error", error: "We couldn't find that profile." };
  if (child.status !== "active") return { mode: "error", error: "This profile is paused. Give consent again first." };

  // One year at a time: renewing opens in the last 30 days of the current year.
  const { data: active } = await supabase
    .from("subscriptions")
    .select("ends_at")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active?.ends_at && new Date(active.ends_at).getTime() - Date.now() > RENEWAL_WINDOW_DAYS * 86_400_000) {
    return { mode: "error", error: `${child.display_name}'s year is already active. Renewal opens 30 days before it ends.` };
  }

  const plan = await getActivePlan();
  if (!plan) return { mode: "error", error: "Pricing isn't set up yet." };
  const discount = await resolveCode(code);
  if (discount.error) return { mode: "error", error: discount.error };
  const q = quoteWith(plan, discount);

  const db = createAdminClient();
  const base = {
    student_id: studentId,
    parent_id: parent.id,
    plan_id: plan.id,
    amount_paise: q.totalPaise,
    list_price_paise: q.listPricePaise,
    discount_paise: q.discountPaise,
    coupon_id: discount.coupon?.id ?? null,
    school_id: discount.school?.id ?? null,
  };

  // A 100% discount needs no payment: activate straight away.
  if (q.totalPaise === 0) {
    const orderId = `free_${randomUUID()}`;
    const { error } = await db.from("subscriptions").insert({ ...base, razorpay_order_id: orderId });
    if (error) return { mode: "error", error: "Something went wrong. Try again." };
    await finalizePaidOrder(orderId, `free_${randomUUID()}`);
    revalidatePath("/parent", "layout");
    return { mode: "done" };
  }

  if (!isRazorpayConfigured()) {
    return { mode: "error", error: "Payments aren't switched on yet. Please try again soon." };
  }

  const { data: pending, error: insertError } = await db
    .from("subscriptions")
    .insert(base)
    .select("id")
    .single();
  if (insertError || !pending) return { mode: "error", error: "Something went wrong. Try again." };

  try {
    const order = await createOrder({
      amountPaise: q.totalPaise,
      receipt: `sub_${pending.id}`,
      notes: { subscription_id: pending.id, student: child.display_name },
    });
    await db.from("subscriptions").update({ razorpay_order_id: order.id }).eq("id", pending.id);
    return {
      mode: "razorpay",
      orderId: order.id,
      keyId: razorpayKeyId()!,
      amountPaise: q.totalPaise,
      childName: child.display_name,
      email: parent.email,
    };
  } catch (err) {
    console.error(err);
    await db.from("subscriptions").delete().eq("id", pending.id).eq("status", "pending");
    return { mode: "error", error: "We couldn't reach the payment gateway. Try again in a minute." };
  }
}

export async function confirmPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<{ ok: boolean; error?: string }> {
  const parent = await requireParent();
  if (!verifyPaymentSignature(input.orderId, input.paymentId, input.signature)) {
    return { ok: false, error: "We couldn't verify that payment. If money left your account, contact us and we'll sort it." };
  }
  // The order must belong to this parent.
  const db = createAdminClient();
  const { data: sub } = await db
    .from("subscriptions")
    .select("parent_id")
    .eq("razorpay_order_id", input.orderId)
    .maybeSingle();
  if (!sub || sub.parent_id !== parent.id) return { ok: false, error: "That payment doesn't match your account." };

  await finalizePaidOrder(input.orderId, input.paymentId);
  revalidatePath("/parent", "layout");
  return { ok: true };
}
