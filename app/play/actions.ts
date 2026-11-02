"use server";

import { redirect } from "next/navigation";
import { requireParent } from "@/lib/auth";
import { clearStudentSession, setStudentSession } from "@/lib/student-session";
import { createClient } from "@/lib/supabase/server";

export type PinState = { error?: string };

const MESSAGES: Record<string, string> = {
  wrong: "Oops, that's not the PIN. Try again.",
  locked: "Too many tries. Take a 5-minute break, then try again.",
  no_pin: "This profile has no PIN yet. Ask a parent to set one in the Parent Zone.",
};

export async function enterProfile(prev: PinState, formData: FormData): Promise<PinState> {
  const parent = await requireParent("/play");
  const studentId = String(formData.get("studentId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!/^\d{4}$/.test(pin)) return { error: "The PIN is 4 digits." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_student_pin", {
    p_student_id: studentId,
    p_pin: pin,
  });
  if (error) return { error: "Something went wrong. Try again." };
  if (data !== "ok") return { error: MESSAGES[data as string] ?? MESSAGES.wrong };

  await setStudentSession(parent.id, studentId);
  redirect("/play");
}

export async function switchProfile() {
  await clearStudentSession();
  redirect("/play");
}
