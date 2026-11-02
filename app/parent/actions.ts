"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireParent } from "@/lib/auth";
import { placementLevel } from "@/lib/bands";
import { CONSENT_VERSION } from "@/lib/consent";
import { createClient } from "@/lib/supabase/server";

export type AddChildState = { error?: string; ok?: boolean };

const childSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Add a first name or nickname")
    .max(24, "Keep it under 24 characters")
    .refine((v) => !/\s\S+\s\S+/.test(v), "First name or nickname only, please"),
  classGrade: z.coerce.number().int().min(6, "Pick a class").max(12, "Pick a class"),
  pin: z.string().regex(/^\d{4}$/, "The PIN is 4 digits"),
  consent: z.literal("on", { error: "We need your consent before creating a profile" }),
});

export async function addChild(prev: AddChildState, formData: FormData): Promise<AddChildState> {
  const parent = await requireParent();
  const parsed = childSchema.safeParse({
    displayName: formData.get("displayName"),
    classGrade: formData.get("classGrade"),
    pin: formData.get("pin"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { displayName, classGrade, pin } = parsed.data;
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      parent_id: parent.id,
      display_name: displayName,
      class_grade: classGrade,
      content_level: placementLevel(classGrade),
      avatar: { cube: "violet" },
    })
    .select("id")
    .single();
  if (error || !student) return { error: "We couldn't save that profile. Try again." };

  const { error: pinError } = await supabase.rpc("set_student_pin", {
    p_student_id: student.id,
    p_pin: pin,
  });
  if (pinError) return { error: "Profile saved, but the PIN didn't. Set it again from the profile." };

  const now = new Date().toISOString();
  await supabase.from("consent_log").insert({
    parent_id: parent.id,
    student_id: student.id,
    action: "given",
    version: CONSENT_VERSION,
    method: "parent_zone_checkbox",
  });
  await supabase
    .from("parents")
    .update({ consent_version: CONSENT_VERSION, consent_at: now })
    .eq("id", parent.id);

  revalidatePath("/parent", "layout");
  return { ok: true };
}

export type ManageState = { error?: string; message?: string };

async function ownChild(studentId: string) {
  const parent = await requireParent();
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, display_name, status")
    .eq("id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  return { parent, supabase, child: data };
}

export async function resetPin(prev: ManageState, formData: FormData): Promise<ManageState> {
  const studentId = String(formData.get("studentId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  if (!/^\d{4}$/.test(pin)) return { error: "The PIN is 4 digits." };
  const { supabase, child } = await ownChild(studentId);
  if (!child) return { error: "We couldn't find that profile." };
  const { error } = await supabase.rpc("set_student_pin", { p_student_id: studentId, p_pin: pin });
  return error ? { error: "That didn't save. Try again." } : { message: `New PIN saved for ${child.display_name}.` };
}

export async function changeClass(prev: ManageState, formData: FormData): Promise<ManageState> {
  const studentId = String(formData.get("studentId") ?? "");
  const classGrade = Number(formData.get("classGrade"));
  if (!Number.isInteger(classGrade) || classGrade < 6 || classGrade > 12) return { error: "Pick a class from 6 to 12." };
  const { supabase, child } = await ownChild(studentId);
  if (!child) return { error: "We couldn't find that profile." };
  // The look follows the class automatically. Course level only moves with
  // progress (lib/bands.ts canMoveUp), so it isn't touched here.
  const { error } = await supabase.from("students").update({ class_grade: classGrade }).eq("id", studentId);
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/parent", "layout");
  return { message: `${child.display_name} is now in class ${classGrade}.` };
}

export async function setConsent(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const action = formData.get("action") === "withdraw" ? "withdrawn" : "given";
  const { parent, supabase, child } = await ownChild(studentId);
  if (!child) return;
  await supabase.from("consent_log").insert({
    parent_id: parent.id,
    student_id: studentId,
    action,
    version: CONSENT_VERSION,
    method: "parent_zone_consent_page",
  });
  // Without consent we stop processing: the profile is paused and can't be opened.
  await supabase
    .from("students")
    .update({ status: action === "withdrawn" ? "paused" : "active" })
    .eq("id", studentId);
  revalidatePath("/parent", "layout");
}

export async function removeChild(prev: ManageState, formData: FormData): Promise<ManageState> {
  const studentId = String(formData.get("studentId") ?? "");
  const confirmName = String(formData.get("confirm") ?? "").trim();
  const { parent, supabase, child } = await ownChild(studentId);
  if (!child) return { error: "We couldn't find that profile." };
  if (confirmName.toLowerCase() !== child.display_name.toLowerCase()) {
    return { error: `Type ${child.display_name} to confirm.` };
  }
  const { error } = await supabase
    .from("students")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", studentId);
  if (error) return { error: "That didn't work. Try again." };
  await supabase.from("consent_log").insert({
    parent_id: parent.id,
    student_id: studentId,
    action: "withdrawn",
    version: CONSENT_VERSION,
    method: "profile_deleted",
  });
  revalidatePath("/parent", "layout");
  return { message: `${child.display_name}'s profile has been deleted.` };
}
