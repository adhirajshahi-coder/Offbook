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

  revalidatePath("/parent");
  return { ok: true };
}
