"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

export type LeadState = { ok?: boolean; error?: string };

const leadSchema = z.object({
  kind: z.enum(["school_pilot", "demo", "newsletter"]),
  name: z.string().trim().min(1, "Tell us your name").max(80),
  email: z.email("Enter a valid email address").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Use digits only for the phone number")
    .optional(),
  organization: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  role: z.string().trim().max(60).optional(),
  message: z.string().trim().max(2000).optional(),
});

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];

/**
 * Public forms → lead_submissions (PRD §12.3). Phase 5 turns these into CRM
 * contacts and deals with dedupe and owner assignment.
 */
export async function submitLead(prev: LeadState, formData: FormData): Promise<LeadState> {
  // Honeypot: real people never fill the hidden "website" field.
  if (String(formData.get("website") ?? "")) return { ok: true };
  if (!isSupabaseConfigured()) return { error: "Forms aren't set up yet. Please email us instead." };

  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v : undefined;
  };
  const parsed = leadSchema.safeParse({
    kind: get("kind"),
    name: get("name"),
    email: get("email")?.toLowerCase(),
    phone: get("phone"),
    organization: get("organization"),
    city: get("city"),
    role: get("role"),
    message: get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.kind === "school_pilot" && !parsed.data.organization) {
    return { error: "Tell us your school's name" };
  }

  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const v = get(key);
    if (v) utm[key] = v.slice(0, 100);
  }

  const db = createAdminClient();
  // Same person, same form, same day: update instead of creating a duplicate.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await db
    .from("lead_submissions")
    .select("id")
    .eq("kind", parsed.data.kind)
    .ilike("email", parsed.data.email)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  const row = { ...parsed.data, utm, referrer: (await headers()).get("referer")?.slice(0, 300) ?? null };
  const { error } = existing
    ? await db.from("lead_submissions").update(row).eq("id", existing.id)
    : await db.from("lead_submissions").insert(row);

  if (error) return { error: "We couldn't send that. Try again in a minute." };
  return { ok: true };
}
