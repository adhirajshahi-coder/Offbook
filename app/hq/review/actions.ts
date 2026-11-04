"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/hq/audit";
import { completeCapstone, completeChallenge, reopenCapstone } from "@/lib/hq/review";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Review queue actions (PRD §11.3). The decision is written as the signed-in
 * reviewer (RLS: reviewer or ops); its effects on progress run server-side.
 */

export type Result = { ok: boolean; error?: string; message?: string };
export type Decision = "approved" | "revision" | "rejected";

async function reviewer() {
  const staff = await requireStaff(["reviewer", "ops"]);
  return { staff, supabase: await createClient() };
}

export async function assignToMe(submissionId: string, unassign = false): Promise<Result> {
  const { staff, supabase } = await reviewer();
  const { data, error } = await supabase
    .from("submissions")
    .update({ assigned_to: unassign ? null : staff.id })
    .eq("id", submissionId)
    .in("status", ["pending", "kept"])
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Couldn't update. It may already be reviewed." };
  await audit(unassign ? "submission.unassign" : "submission.assign", "submission", submissionId);
  revalidatePath("/hq/review");
  revalidatePath(`/hq/review/${submissionId}`);
  return { ok: true, message: unassign ? "Back in the queue." : "Assigned to you." };
}

export async function decideSubmission(input: { id: string; decision: Decision; feedback: string; rubricChecks: boolean[] }): Promise<Result> {
  const { staff, supabase } = await reviewer();
  const feedback = input.feedback.trim().slice(0, 2000);
  if (input.decision !== "approved" && feedback.length < 10) return { ok: false, error: "Tell the student what to change: a sentence at least." };

  const { data: sub } = await supabase
    .from("submissions")
    .select("id, student_id, kind, course_id, challenge_id, content, status")
    .eq("id", input.id)
    .single();
  if (!sub) return { ok: false, error: "Submission not found." };

  // The status guard makes a double click (or two reviewers) a no-op.
  const { data: updated, error } = await supabase
    .from("submissions")
    .update({
      status: input.decision,
      feedback: feedback || null,
      rubric_checks: input.rubricChecks.slice(0, 20),
      reviewer_id: staff.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .in("status", ["pending", "kept"])
    .select("id");
  if (error || !updated?.length) return { ok: false, error: "Already reviewed by someone else." };

  const db = createAdminClient();
  let message = "Saved.";
  if (sub.kind === "capstone" && sub.course_id) {
    if (input.decision === "approved") {
      const { code } = await completeCapstone(db, { id: sub.id, student_id: sub.student_id, course_id: sub.course_id, content: sub.content });
      message = `Approved. Course completed, certificate ${code} issued, parent emailed.`;
    } else {
      await reopenCapstone(db, sub.student_id, sub.course_id);
      message = input.decision === "revision" ? "Sent back for changes. The capstone is open again." : "Not accepted. The student can try again.";
    }
  } else if (sub.kind === "challenge" && sub.challenge_id) {
    if (input.decision === "approved") {
      await completeChallenge(db, { id: sub.id, student_id: sub.student_id, challenge_id: sub.challenge_id, content: sub.content });
      message = "Approved. XP awarded and added to the portfolio.";
    } else message = input.decision === "revision" ? "Sent back for changes." : "Not accepted.";
  }

  await audit(`submission.${input.decision}`, "submission", sub.id, { kind: sub.kind, student_id: sub.student_id });
  revalidatePath("/hq/review");
  revalidatePath(`/hq/review/${sub.id}`);
  return { ok: true, message };
}

/** Showcase moderation: only items a parent offered can be approved (the DB guard and this filter both check). */
export async function moderateShowcase(itemId: string, approve: boolean): Promise<Result> {
  const { supabase } = await reviewer();
  const { data, error } = await supabase
    .from("portfolio_items")
    .update({ showcase_status: approve ? "approved" : "rejected" })
    .eq("id", itemId)
    .eq("showcase_consent", true)
    .eq("showcase_status", "pending")
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Couldn't update. The parent may have withdrawn consent." };
  await audit(approve ? "showcase.approve" : "showcase.reject", "portfolio_item", itemId);
  revalidatePath("/hq/review/showcase");
  revalidatePath("/showcase");
  return { ok: true, message: approve ? "On the Showcase." : "Not shown." };
}
