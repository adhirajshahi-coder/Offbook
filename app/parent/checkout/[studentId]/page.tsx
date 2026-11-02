import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParent } from "@/lib/auth";
import { refundWindowDays } from "@/lib/public-data";
import { isRazorpayConfigured, isRazorpayTestMode } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";
import { previewQuote } from "../actions";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: PageProps<"/parent/checkout/[studentId]">) {
  await requireParent();
  const { studentId } = await params;
  const supabase = await createClient();
  const { data: child } = await supabase
    .from("students")
    .select("id, display_name")
    .eq("id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!child) notFound();

  const [initial, refundDays] = await Promise.all([previewQuote(""), refundWindowDays()]);

  return (
    <div className="mx-auto max-w-md">
      <Link href="/parent" className="text-sm text-muted underline underline-offset-4">
        Back to Overview
      </Link>
      <h1 className="mt-3 text-3xl font-black">Start {child.display_name}&apos;s year</h1>
      <p className="mt-1 text-muted">
        Full access to every course, game and challenge for 12 months. Full refund within {refundDays} days if
        it&apos;s not for you.
      </p>
      <div className="mt-6 rounded-[14px] border border-line bg-white p-5">
        <CheckoutForm
          studentId={child.id}
          childName={child.display_name}
          initial={initial}
          paymentsReady={isRazorpayConfigured()}
          testMode={isRazorpayTestMode()}
        />
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Payments are handled by Razorpay. Offbook never sees or stores your card details.
      </p>
    </div>
  );
}
