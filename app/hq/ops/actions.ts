"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { refundDecisionEmail } from "@/lib/email-templates";
import { audit } from "@/lib/hq/audit";
import { formatRupees } from "@/lib/pricing";
import { isRazorpayConfigured, refundPayment } from "@/lib/razorpay";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Operations actions (PRD §11). Run as the signed-in staff member (RLS
 * enforces the ops role); every sensitive change is written to the audit log.
 */

export type Result = { ok: boolean; error?: string; message?: string };

async function ops() {
  const staff = await requireStaff(["ops"]);
  return { staff, supabase: await createClient() };
}

const done = (path: string, message: string): Result => {
  revalidatePath(path);
  return { ok: true, message };
};

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function opsResetPin(studentId: string, pin: string): Promise<Result> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "The PIN is 4 digits." };
  const { supabase } = await ops();
  const { error } = await supabase.rpc("set_student_pin", { p_student_id: studentId, p_pin: pin });
  if (error) return { ok: false, error: "That didn't save." };
  await audit("student.pin_reset", "student", studentId);
  return done(`/hq/ops/students/${studentId}`, "PIN reset. Tell the parent the new PIN.");
}

export async function opsSetClass(studentId: string, classGrade: number, contentLevel: number, reason: string): Promise<Result> {
  if (classGrade < 6 || classGrade > 12 || contentLevel < 1 || contentLevel > 3) return { ok: false, error: "Pick a valid class and level." };
  if (reason.trim().length < 5) return { ok: false, error: "Add a short reason for the record." };
  const { supabase } = await ops();
  const { data: before } = await supabase.from("students").select("class_grade, content_level").eq("id", studentId).single();
  const { error } = await supabase.from("students").update({ class_grade: classGrade, content_level: contentLevel }).eq("id", studentId);
  if (error) return { ok: false, error: "That didn't save." };
  await audit("student.placement_change", "student", studentId, { before, after: { class_grade: classGrade, content_level: contentLevel }, reason: reason.trim() });
  return done(`/hq/ops/students/${studentId}`, "Placement updated. Progress carries over.");
}

export async function opsSetStatus(studentId: string, status: "active" | "paused", reason: string): Promise<Result> {
  if (reason.trim().length < 5) return { ok: false, error: "Add a short reason for the record." };
  const { supabase } = await ops();
  const { error } = await supabase.from("students").update({ status }).eq("id", studentId);
  if (error) return { ok: false, error: "That didn't save." };
  await audit(`student.${status === "paused" ? "pause" : "activate"}`, "student", studentId, { reason: reason.trim() });
  return done(`/hq/ops/students/${studentId}`, status === "paused" ? "Profile paused." : "Profile active again.");
}

/** Staff override (PRD §8): unlock a course, or reset its progress. Always audited. */
export async function opsOverrideCourse(studentId: string, courseId: string, action: "unlock" | "reset", reason: string): Promise<Result> {
  if (reason.trim().length < 5) return { ok: false, error: "Add a short reason for the record." };
  const { staff, supabase } = await ops();
  const { error } = await supabase.from("course_overrides").insert({ student_id: studentId, course_id: courseId, action, reason: reason.trim(), created_by: staff.id });
  if (error) return { ok: false, error: "That didn't save." };
  if (action === "reset") {
    // Clear this course's progress so the student starts it fresh. Progress
    // tables have no client write access, so this uses the service role,
    // after the ops role check above. XP already earned stays in the ledger.
    const admin = createAdminClient();
    const { data: missions } = await admin.from("missions").select("id, lessons(id, lesson_steps(id))").eq("course_id", courseId);
    const missionIds = (missions ?? []).map((m) => m.id);
    const lessonIds = (missions ?? []).flatMap((m) => (m.lessons ?? []).map((l: { id: string }) => l.id));
    const stepIds = (missions ?? []).flatMap((m) => (m.lessons ?? []).flatMap((l: { lesson_steps: { id: string }[] }) => (l.lesson_steps ?? []).map((st) => st.id)));
    await Promise.all([
      admin.from("course_progress").delete().eq("student_id", studentId).eq("course_id", courseId),
      missionIds.length ? admin.from("mission_progress").delete().eq("student_id", studentId).in("mission_id", missionIds) : null,
      lessonIds.length ? admin.from("lesson_progress").delete().eq("student_id", studentId).in("lesson_id", lessonIds) : null,
      stepIds.length ? admin.from("step_progress").delete().eq("student_id", studentId).in("step_id", stepIds) : null,
      admin.from("submissions").update({ status: "rejected", feedback: "Course reset by Offbook staff." }).eq("student_id", studentId).eq("course_id", courseId).eq("status", "pending"),
    ]);
  }
  await audit(`course.${action}`, "student", studentId, { course_id: courseId, reason: reason.trim() });
  return done(`/hq/ops/students/${studentId}`, action === "unlock" ? "Course unlocked for this student." : "Course progress reset for this student.");
}

// ---------------------------------------------------------------------------
// Subscriptions and refunds
// ---------------------------------------------------------------------------

export async function opsExtendSubscription(subscriptionId: string, days: number, reason: string): Promise<Result> {
  if (!Number.isInteger(days) || days < 1 || days > 365) return { ok: false, error: "Extend by 1 to 365 days." };
  if (reason.trim().length < 5) return { ok: false, error: "Add a short reason for the record." };
  const { supabase } = await ops();
  const { data: sub } = await supabase.from("subscriptions").select("ends_at, status").eq("id", subscriptionId).single();
  if (!sub?.ends_at || sub.status !== "active") return { ok: false, error: "Only active plans can be extended." };
  const ends = new Date(new Date(sub.ends_at).getTime() + days * 86_400_000).toISOString();
  const { error } = await supabase.from("subscriptions").update({ ends_at: ends }).eq("id", subscriptionId);
  if (error) return { ok: false, error: "That didn't save." };
  await audit("subscription.extend", "subscription", subscriptionId, { days, from: sub.ends_at, to: ends, reason: reason.trim() });
  return done("/hq/ops/subscriptions", `Extended by ${days} days.`);
}

export async function opsDecideRefund(refundId: string, decision: "approve" | "reject", note: string): Promise<Result> {
  const { staff, supabase } = await ops();
  const { data: r } = await supabase
    .from("refunds")
    .select("id, status, amount_paise, subscription_id, subscriptions(razorpay_payment_id, students(display_name), parents(name, email))")
    .eq("id", refundId)
    .single();
  if (!r || r.status !== "requested") return { ok: false, error: "This refund was already handled." };
  if (decision === "reject" && note.trim().length < 5) return { ok: false, error: "Tell the parent why, in a sentence." };

  const sub = r.subscriptions as unknown as { razorpay_payment_id: string | null; students: { display_name: string } | null; parents: { name: string | null; email: string | null } | null };
  let status: "approved" | "processed" | "rejected" = decision === "reject" ? "rejected" : "approved";
  let razorpayRefundId: string | null = null;
  let message = "Refund declined. The parent has been emailed.";

  if (decision === "approve") {
    const payId = sub.razorpay_payment_id;
    if (isRazorpayConfigured() && payId?.startsWith("pay_")) {
      try {
        const rf = await refundPayment(payId, r.amount_paise ?? 0);
        razorpayRefundId = rf.id;
        status = "processed";
        message = "Refund sent through Razorpay. The parent has been emailed.";
      } catch (e) {
        console.error(e);
        return { ok: false, error: "Razorpay didn't accept the refund. Nothing was changed; try again or refund from the Razorpay dashboard." };
      }
    } else {
      message = "Approved. This payment wasn't made through Razorpay here, so refund it manually and mark it processed.";
    }
    // The plan ends now: access stops with the refund.
    await supabase.from("subscriptions").update({ status: "refunded", ends_at: new Date().toISOString() }).eq("id", r.subscription_id);
  }

  const { error } = await supabase
    .from("refunds")
    .update({ status, razorpay_refund_id: razorpayRefundId, handled_by: staff.id })
    .eq("id", refundId);
  if (error) return { ok: false, error: "That didn't save." };
  await audit(`refund.${decision}`, "refund", refundId, { amount_paise: r.amount_paise, note: note.trim() || null, razorpay_refund_id: razorpayRefundId });

  if (sub.parents?.email) {
    const child = sub.students?.display_name ?? "your child";
    const amount = formatRupees(r.amount_paise ?? 0);
    await sendEmail({ to: sub.parents.email, ...refundDecisionEmail({ parentName: sub.parents.name, childName: child, approved: decision === "approve", amount, note: note.trim() || null }) });
  }
  return done("/hq/ops/subscriptions", message);
}

export async function opsMarkRefundProcessed(refundId: string): Promise<Result> {
  const { staff, supabase } = await ops();
  const { error } = await supabase.from("refunds").update({ status: "processed", handled_by: staff.id }).eq("id", refundId).eq("status", "approved");
  if (error) return { ok: false, error: "That didn't save." };
  await audit("refund.mark_processed", "refund", refundId);
  return done("/hq/ops/subscriptions", "Marked as processed.");
}
