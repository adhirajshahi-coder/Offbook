"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/lib/auth";
import { refundWindowDays } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";

export async function setRenewalReminders(formData: FormData) {
  await requireParent();
  const supabase = await createClient();
  await supabase
    .from("subscriptions")
    .update({ renewal_reminders: formData.get("on") === "true" })
    .eq("id", String(formData.get("subscriptionId") ?? ""));
  revalidatePath("/parent/billing");
}

export type RefundState = { error?: string; message?: string };

export async function requestRefund(prev: RefundState, formData: FormData): Promise<RefundState> {
  const parent = await requireParent();
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000) || null;
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, starts_at, amount_paise, refunds(id)")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub || sub.status !== "active" || !sub.starts_at) return { error: "That plan can't be refunded." };
  if ((sub.refunds ?? []).length > 0) return { error: "You've already asked for a refund on this plan." };

  const days = await refundWindowDays();
  const paidAgo = Date.now() - new Date(sub.starts_at).getTime();
  if (paidAgo > days * 86_400_000) {
    return { error: `The ${days}-day refund window has passed. Contact us if something went wrong.` };
  }

  const { error } = await supabase.from("refunds").insert({
    subscription_id: sub.id,
    parent_id: parent.id,
    reason,
    amount_paise: sub.amount_paise,
  });
  if (error) return { error: "That didn't go through. Try again." };
  revalidatePath("/parent/billing");
  return { message: "Refund requested. We'll process it within 5 working days and email you when it's done." };
}
