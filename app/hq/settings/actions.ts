"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff, type StaffRole } from "@/lib/auth";
import { audit } from "@/lib/hq/audit";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type Result = { ok: boolean; error?: string; message?: string };

const ROLES = ["admin", "sales", "marketing", "ops", "content", "teacher", "reviewer", "viewer"] as const;

/**
 * Add a staff member (PRD §12.10). Creating the sign-in account needs the
 * service role; it runs only after the admin check and is audited. They then
 * log in with an email code like everyone else.
 */
export async function addStaff(input: { email: string; name: string; role: StaffRole }): Promise<Result> {
  const me = await requireStaff([]);
  if (me.role !== "admin") return { ok: false, error: "Only admins can add staff." };
  const parsed = z.object({ email: z.email(), name: z.string().trim().min(2).max(80), role: z.enum(ROLES) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the name, email and role." };
  const { email, name, role } = parsed.data;

  const admin = createAdminClient();
  let userId: string | null = null;
  for (let page = 1; page < 20 && !userId; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    userId = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
    if (!data || data.users.length < 200) break;
  }
  if (userId) {
    const { data: parent } = await admin.from("parents").select("id").eq("id", userId).maybeSingle();
    if (parent) return { ok: false, error: "That email belongs to a parent account. Use a work email for staff." };
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { kind: "staff", name } });
    if (error || !data.user) return { ok: false, error: "Couldn't create the account." };
    userId = data.user.id;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("staff").upsert({ id: userId, name, role, active: true });
  if (error) return { ok: false, error: "That didn't save." };
  await audit("staff.add", "staff", userId, { email, role });
  revalidatePath("/hq/settings/team");
  return { ok: true, message: `${name} can now log in at /login with an email code.` };
}

export async function updateStaff(id: string, input: { role: StaffRole; active: boolean }): Promise<Result> {
  const me = await requireStaff([]);
  if (me.role !== "admin") return { ok: false, error: "Only admins can change roles." };
  if (!ROLES.includes(input.role as (typeof ROLES)[number])) return { ok: false, error: "Unknown role." };
  if (id === me.id && (input.role !== "admin" || !input.active)) return { ok: false, error: "You can't remove your own admin access. Ask another admin." };
  const supabase = await createClient();
  const { data: before } = await supabase.from("staff").select("role, active").eq("id", id).single();
  const { error } = await supabase.from("staff").update({ role: input.role, active: input.active }).eq("id", id);
  if (error) return { ok: false, error: "That didn't save." };
  await audit("staff.role_change", "staff", id, { before, after: input });
  revalidatePath("/hq/settings/team");
  return { ok: true, message: "Saved." };
}
