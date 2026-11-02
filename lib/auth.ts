import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getStudentSessionId } from "@/lib/student-session";

export type StaffRole =
  | "admin"
  | "sales"
  | "marketing"
  | "ops"
  | "content"
  | "teacher"
  | "reviewer"
  | "viewer";

/** The signed-in auth user's id, or null. Verified against Supabase's keys. */
export const getUserId = cache(async (): Promise<string | null> => {
  // Always per request: auth must never be baked into a prerendered page.
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

export const getStaff = cache(async () => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("id, name, role, active")
    .eq("id", userId)
    .maybeSingle();
  return data && data.active ? (data as { id: string; name: string; role: StaffRole; active: boolean }) : null;
});

export const getParent = cache(async () => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("parents")
    .select("id, name, email, phone, consent_version, consent_at")
    .eq("id", userId)
    .maybeSingle();
  return data;
});

export async function requireParent(next = "/parent") {
  const parent = await getParent();
  if (!parent) {
    // Staff accounts have no parent row; send them to HQ rather than a login loop.
    if (await getStaff()) redirect("/hq");
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return parent;
}

/** Admins pass every role check, matching public.is_staff() in Postgres. */
export async function requireStaff(roles?: StaffRole[]) {
  const staff = await getStaff();
  if (!staff) redirect("/login?next=/hq");
  if (roles && staff.role !== "admin" && !roles.includes(staff.role)) {
    redirect("/hq?denied=1");
  }
  return staff;
}

/** The selected child profile for /play, or null if none is chosen yet. */
export async function getActiveStudent() {
  const parent = await getParent();
  if (!parent) return null;
  const studentId = await getStudentSessionId(parent.id);
  if (!studentId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, display_name, class_grade, band, content_level, avatar, xp, level, rank, weekly_goal")
    .eq("id", studentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  // A refund, expiry or withdrawn consent ends play even mid-session.
  const { data: active } = await supabase.rpc("has_active_subscription", { p_student_id: data.id });
  return active ? data : null;
}
