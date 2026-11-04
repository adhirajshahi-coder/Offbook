import "server-only";
import type { Student } from "@/lib/play/session";
import { loadWorld } from "@/lib/play/state";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Real-world challenges (PRD §7.9): read the brief and safety note, ask a
 * parent, do it offline, then submit text or a link for review. No photo
 * uploads from children in this release (D-045).
 */

export type ChallengeState = "locked" | "ask" | "waiting" | "ready" | "submitted" | "revision" | "approved" | "rejected";

export type ChallengeCard = {
  id: string;
  title: string;
  type: "challenge_week" | "real_world" | "sponsored";
  brief: string;
  rubric: string[];
  safetyNote: string;
  xp: number;
  endsAt: string | null;
  trackName: string;
  requiredCourse: { slug: string; title: string } | null;
  state: ChallengeState;
  feedback: string | null;
};

export const TYPE_LABEL: Record<ChallengeCard["type"], string> = {
  challenge_week: "Challenge week",
  real_world: "Real-world challenge",
  sponsored: "Sponsored challenge",
};

export const STATE_LABEL: Record<ChallengeState, string> = {
  locked: "Locked",
  ask: "Ask a parent to start",
  waiting: "Waiting for a parent's okay",
  ready: "Ready to do",
  submitted: "Sent for review",
  revision: "Reviewer asked for changes",
  approved: "Done ★",
  rejected: "Not accepted",
};

export async function loadChallenges(student: Student, now = new Date()): Promise<ChallengeCard[]> {
  const db = createAdminClient();
  const iso = now.toISOString();
  const [world, challenges, permissions, submissions] = await Promise.all([
    loadWorld(student),
    db
      .from("challenges")
      .select("id, type, title, brief, rubric, safety_note, starts_at, ends_at, xp, track_id, required_course_id, band, parent_ack_required")
      .eq("status", "published")
      .or(`starts_at.is.null,starts_at.lte.${iso}`)
      .or(`ends_at.is.null,ends_at.gte.${iso}`)
      .order("created_at"),
    db.from("challenge_permissions").select("challenge_id, granted_at").eq("student_id", student.id),
    db.from("submissions").select("challenge_id, status, feedback, created_at").eq("student_id", student.id).eq("kind", "challenge").order("created_at"),
  ]);
  const trackName = new Map(world.tracks.map((t) => [t.id, t.zone_name]));
  const course = new Map(world.courses.map((c) => [c.id, c]));
  const perm = new Map((permissions.data ?? []).map((p) => [p.challenge_id, p]));
  const latest = new Map<string, { status: string; feedback: string | null }>();
  for (const s of submissions.data ?? []) if (s.challenge_id) latest.set(s.challenge_id, s); // ordered, so the last one wins

  return (challenges.data ?? [])
    .filter((c) => !c.band || c.band === student.band)
    .map((c) => {
      const req = c.required_course_id ? course.get(c.required_course_id) : undefined;
      const courseState = c.required_course_id ? world.unlock.states[c.required_course_id] : "completed";
      const reached = courseState !== undefined && courseState !== "locked" && courseState !== "available";
      const sub = latest.get(c.id);
      const p = perm.get(c.id);
      let state: ChallengeState;
      if (sub?.status === "approved") state = "approved";
      else if (sub?.status === "pending") state = "submitted";
      else if (sub?.status === "revision") state = "revision";
      else if (sub?.status === "rejected") state = "rejected";
      else if (!reached) state = "locked";
      else if (!c.parent_ack_required || p?.granted_at) state = "ready";
      else if (p) state = "waiting";
      else state = "ask";
      return {
        id: c.id,
        title: c.title,
        type: c.type,
        brief: c.brief,
        rubric: Array.isArray(c.rubric) ? (c.rubric as string[]) : [],
        safetyNote: c.safety_note,
        xp: c.xp,
        endsAt: c.ends_at,
        trackName: c.track_id ? (trackName.get(c.track_id) ?? "") : "",
        requiredCourse: req ? { slug: req.slug, title: req.short_title ?? req.title } : null,
        state,
        feedback: sub?.feedback ?? null,
      };
    });
}
