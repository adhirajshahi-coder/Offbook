import "server-only";
import { randomInt } from "node:crypto";
import { sendEmail } from "@/lib/email";
import { courseCompleteEmail } from "@/lib/email-templates";
import { RANK_LABEL, XP, type Rank } from "@/lib/gamification/xp";
import { awardXp, checkBadges, refreshTotals } from "@/lib/play/progress";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * What happens when a reviewer decides on a submission (PRD §7.9, §11.3).
 * Progress, XP, certificates and portfolio rows have no client write access,
 * so these run with the service role, after the caller has checked the
 * reviewer/ops role and recorded the decision through RLS.
 */

type Db = ReturnType<typeof createAdminClient>;

export const SLA_HOURS = 48;
export const SLA_ALERT_HOURS = 36;

export const CAPSTONE_RUBRIC = [
  "Meets the capstone brief",
  "Shows what they learned, in their own words",
  "Explains choices or what they'd improve",
  "Safe to share: no personal details or photos of people",
];

export const CANNED_FEEDBACK: { label: string; text: string; decision: "approved" | "revision" | "rejected" }[] = [
  { label: "Great work", decision: "approved", text: "Brilliant work! You clearly explained what you did and what you learned. Keep it up." },
  { label: "Approved, one tip", decision: "approved", text: "Approved! One tip for next time: say a bit more about why you made your choices." },
  { label: "Needs more detail", decision: "revision", text: "Good start! Please add more detail about what you did and what you found out, then send it again." },
  { label: "Missing a step", decision: "revision", text: "Nearly there. One part of the brief is missing. Check the list of what reviewers look for and add it." },
  { label: "Remove personal info", decision: "revision", text: "Please remove personal details (full names, phone numbers, addresses or school name) and send it again." },
  { label: "Not their own work", decision: "rejected", text: "This doesn't look like your own work. Have another go in your own words; we'd love to see what you think." },
];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

export function certificateCode(): string {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  return `OB-${part()}-${part()}`;
}


function summaryOf(content: { text?: string } | null): string {
  const t = (content?.text ?? "").replace(/\s+/g, " ").trim();
  return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

async function issueCertificate(db: Db, studentId: string, courseId: string, title: string): Promise<string> {
  const { data: existing } = await db.from("certificates").select("code").eq("student_id", studentId).eq("course_id", courseId).maybeSingle();
  if (existing) return existing.code;
  for (let i = 0; i < 5; i++) {
    const code = certificateCode();
    const { error } = await db.from("certificates").insert({ code, student_id: studentId, course_id: courseId, title });
    if (!error) return code;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Couldn't issue a certificate code");
}

/** Approving a capstone completes the course: XP, rank, certificate, portfolio card, parent email. */
export async function completeCapstone(db: Db, sub: { id: string; student_id: string; course_id: string; content: { text?: string } | null }) {
  const [{ data: course }, { data: student }] = await Promise.all([
    db.from("courses").select("id, title, track_id").eq("id", sub.course_id).single(),
    db.from("students").select("id, display_name, parent_id").eq("id", sub.student_id).single(),
  ]);
  if (!course || !student) throw new Error("Course or student missing");

  await db
    .from("course_progress")
    .upsert({ student_id: sub.student_id, course_id: sub.course_id, status: "completed", completed_at: new Date().toISOString() }, { onConflict: "student_id,course_id" });
  await awardXp(db, sub.student_id, "capstone", sub.course_id, XP.projectApproved);

  const { data: mastery } = await db.from("skill_mastery").select("level, skills!inner(name, track_id)").eq("student_id", sub.student_id).eq("skills.track_id", course.track_id).gte("level", 1).limit(6);
  const skills = (mastery ?? []).map((m) => (m.skills as unknown as { name: string }).name);

  const [code] = await Promise.all([
    issueCertificate(db, sub.student_id, sub.course_id, course.title),
    db.from("portfolio_items").upsert(
      { student_id: sub.student_id, source_type: "capstone", source_id: sub.course_id, submission_id: sub.id, title: course.title, summary: summaryOf(sub.content), skills },
      { onConflict: "student_id,source_type,source_id" },
    ),
  ]);
  const totals = await refreshTotals(db, sub.student_id);
  await checkBadges(db, sub.student_id);

  const { data: parent } = await db.from("parents").select("email, name").eq("id", student.parent_id).single();
  if (parent?.email) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const rank = RANK_LABEL[totals.rank as Rank] ?? totals.rank;
    await sendEmail({
      to: parent.email,
      ...courseCompleteEmail({ parentName: parent.name, childName: student.display_name, courseTitle: course.title, certificateUrl: `${site}/certificates/${code}`, rank, xp: totals.xp }),
    });
  }
  return { code };
}

/** Approving a challenge awards its XP and adds a portfolio card. */
export async function completeChallenge(db: Db, sub: { id: string; student_id: string; challenge_id: string; content: { text?: string } | null }) {
  const { data: challenge } = await db.from("challenges").select("id, title, xp").eq("id", sub.challenge_id).single();
  if (!challenge) throw new Error("Challenge missing");
  await Promise.all([
    awardXp(db, sub.student_id, "challenge", challenge.id, challenge.xp),
    db.from("portfolio_items").upsert(
      { student_id: sub.student_id, source_type: "challenge", source_id: challenge.id, submission_id: sub.id, title: challenge.title, summary: summaryOf(sub.content), skills: [] },
      { onConflict: "student_id,source_type,source_id" },
    ),
  ]);
  await refreshTotals(db, sub.student_id);
}

/** A capstone sent back reopens so the student can resubmit. */
export async function reopenCapstone(db: Db, studentId: string, courseId: string) {
  await db.from("course_progress").update({ status: "in_progress" }).eq("student_id", studentId).eq("course_id", courseId).eq("status", "pending_review");
}
