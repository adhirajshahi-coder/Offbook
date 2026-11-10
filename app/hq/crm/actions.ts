"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { CRM_WRITE } from "@/lib/crm/data";
import { captureLead } from "@/lib/crm/leads";
import { findDuplicate, normalizeEmail, normalizePhone } from "@/lib/crm/rules";
import { audit } from "@/lib/hq/audit";
import { createClient } from "@/lib/supabase/server";

/**
 * CRM writes (PRD §12). Run as the signed-in staff member; RLS limits writes
 * to sales and marketing (ops may flag families and log family activities).
 */

export type Result = { ok: boolean; error?: string; message?: string; id?: string };

async function writer() {
  const staff = await requireStaff(CRM_WRITE);
  return { staff, supabase: await createClient() };
}

const done = (paths: string[], message = "Saved.", id?: string): Result => {
  for (const p of paths) revalidatePath(p);
  return { ok: true, message, id };
};
const fail = (error: { message: string } | null, fallback = "That didn't save. Try again."): Result => {
  if (error) console.error("[crm]", error.message);
  return { ok: false, error: fallback };
};

const optionalText = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional());
const optionalId = z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable().optional());
const custom = z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string()), z.null()])).optional();

// ---------------------------------------------------------------------------
// Contacts and organizations
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().trim().min(1, "Add a name").max(120),
  email: optionalText(120),
  phone: optionalText(20),
  title: optionalText(80),
  kind: z.enum(["principal", "coordinator", "teacher", "parent_lead", "creator", "partner", "other"]),
  organization_id: optionalId,
  owner_id: optionalId,
  source: optionalText(80),
  custom,
});

export async function saveContact(id: string | null, input: z.input<typeof contactSchema>): Promise<Result> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  const email = v.email ? normalizeEmail(v.email) : null;
  if (v.email && !email) return { ok: false, error: "That email doesn't look right." };
  const { supabase } = await writer();
  const row = { ...v, email };
  const { data, error } = id
    ? await supabase.from("contacts").update(row).eq("id", id).select("id").single()
    : await supabase.from("contacts").insert({ ...row, source: row.source ?? "manual" }).select("id").single();
  if (error?.code === "23505") return { ok: false, error: "A contact with this email already exists." };
  if (error || !data) return fail(error);
  return done(["/hq/crm/contacts", `/hq/crm/contacts/${data.id}`], "Saved.", data.id);
}

const orgSchema = z.object({
  name: z.string().trim().min(1, "Add a name").max(160),
  kind: z.enum(["school", "partner", "other"]),
  city: optionalText(60),
  state: optionalText(60),
  board: z.preprocess((v) => (v === "" ? null : v), z.enum(["CBSE", "ICSE", "State", "IB", "IGCSE", "Other"]).nullable().optional()),
  website: optionalText(200),
  owner_id: optionalId,
  school_id: optionalId,
  custom,
});

export async function saveOrganization(id: string | null, input: z.input<typeof orgSchema>): Promise<Result> {
  const parsed = orgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await writer();
  const { data, error } = id
    ? await supabase.from("organizations").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("organizations").insert(parsed.data).select("id").single();
  if (error?.code === "23505") return { ok: false, error: "That school code is already linked to another organization." };
  if (error || !data) return fail(error);
  return done(["/hq/crm/organizations", `/hq/crm/organizations/${data.id}`], "Saved.", data.id);
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

const dealSchema = z.object({
  pipeline_id: z.uuid(),
  stage_id: z.uuid(),
  title: z.string().trim().min(1, "Add a title").max(160),
  organization_id: optionalId,
  contact_id: optionalId,
  owner_id: optionalId,
  value_paise: z.coerce.number().int().min(0).max(10_000_000_000),
  expected_close: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable().optional()),
  source: optionalText(80),
  campaign_id: optionalId,
  lost_reason: optionalText(300),
  custom,
});

export async function saveDeal(id: string | null, input: z.input<typeof dealSchema>): Promise<Result> {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await writer();
  const { data, error } = id
    ? await supabase.from("deals").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("deals").insert({ ...parsed.data, source: parsed.data.source ?? "manual" }).select("id").single();
  if (error || !data) return fail(error);
  return done(["/hq/crm", `/hq/crm/deals/${data.id}`], "Saved.", data.id);
}

/** Kanban drag: move to another stage of the same pipeline (the DB checks it belongs). */
export async function moveDeal(dealId: string, stageId: string): Promise<Result> {
  const { supabase } = await writer();
  const { error } = await supabase.from("deals").update({ stage_id: stageId }).eq("id", dealId);
  if (error) return fail(error, "Couldn't move that deal.");
  revalidatePath(`/hq/crm/deals/${dealId}`);
  return { ok: true, message: "Moved." };
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

const activitySchema = z.object({
  type: z.enum(["call", "meeting", "whatsapp", "email", "note", "task"]),
  subject: z.string().trim().min(1, "Add a subject").max(200),
  body: optionalText(4000),
  due_at: z.preprocess((v) => (v === "" ? null : v), z.iso.datetime({ offset: true }).nullable().optional()),
  done: z.boolean(),
  owner_id: optionalId,
  deal_id: optionalId,
  contact_id: optionalId,
  organization_id: optionalId,
  family_parent_id: optionalId,
});

export async function addActivity(input: z.input<typeof activitySchema>): Promise<Result> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (!v.deal_id && !v.contact_id && !v.organization_id && !v.family_parent_id) return { ok: false, error: "Attach it to a record." };
  if (!v.done && !v.due_at && v.type !== "note") return { ok: false, error: "Add a due date, or mark it done." };
  const staff = await requireStaff([...CRM_WRITE, "ops"]);
  const supabase = await createClient();
  const { done: isDone, ...row } = v;
  const { error } = await supabase.from("activities").insert({
    ...row,
    owner_id: row.owner_id ?? staff.id,
    created_by: staff.id,
    done_at: isDone || v.type === "note" ? new Date().toISOString() : null,
  });
  if (error) return fail(error);
  revalidatePath("/hq/crm", "layout");
  return { ok: true, message: v.type === "note" ? "Note added." : isDone ? "Logged." : "Scheduled." };
}

export async function completeActivity(id: string, undo = false): Promise<Result> {
  const { supabase } = await writer();
  const { error } = await supabase.from("activities").update({ done_at: undo ? null : new Date().toISOString() }).eq("id", id);
  if (error) return fail(error);
  revalidatePath("/hq/crm", "layout");
  return { ok: true, message: undo ? "Reopened." : "Done." };
}

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

export async function updateFamily(parentId: string, input: { owner_id?: string | null; at_risk?: boolean; custom?: Record<string, unknown> }): Promise<Result> {
  await requireStaff([...CRM_WRITE, "ops"]);
  const supabase = await createClient();
  const patch: Record<string, unknown> = { ...input };
  if (input.at_risk !== undefined) patch.at_risk_since = input.at_risk ? new Date().toISOString() : null;
  const { error } = await supabase.from("families").update(patch).eq("parent_id", parentId);
  if (error) return fail(error);
  return done([`/hq/crm/families/${parentId}`, "/hq/crm/families"]);
}

// ---------------------------------------------------------------------------
// Saved views
// ---------------------------------------------------------------------------

export async function saveView(input: { object: "contact" | "organization" | "deal" | "family"; name: string; filters: Record<string, string>; shared: boolean }): Promise<Result> {
  await requireStaff();
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Name the view." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_views").insert({ object: input.object, name, filters: input.filters, shared: input.shared }).select("id").single();
  if (error || !data) return fail(error);
  return { ok: true, message: "View saved.", id: data.id };
}

export async function deleteView(id: string): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("saved_views").delete().eq("id", id);
  return error ? fail(error) : { ok: true, message: "View deleted." };
}

// ---------------------------------------------------------------------------
// CSV import (PRD §12.3): rows already mapped and previewed in the browser
// ---------------------------------------------------------------------------

const importRow = z.object({
  name: z.string().trim().min(1).max(120),
  email: optionalText(120),
  phone: optionalText(20),
  title: optionalText(80),
  organization: optionalText(160),
  city: optionalText(60),
  board: optionalText(20),
  kind: optionalText(30),
});

export async function importContacts(rows: unknown[], source: string): Promise<Result & { created?: number; merged?: number; skipped?: number }> {
  await writer();
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "Nothing to import." };
  if (rows.length > 2000) return { ok: false, error: "Import up to 2,000 rows at a time." };
  let created = 0;
  let merged = 0;
  let skipped = 0;
  for (const raw of rows) {
    const r = importRow.safeParse(raw);
    if (!r.success || (!r.data.email && !r.data.phone)) {
      skipped++;
      continue;
    }
    try {
      const res = await captureLead({
        kind: "import",
        name: r.data.name,
        email: r.data.email,
        phone: r.data.phone,
        title: r.data.title,
        organization: r.data.organization,
        city: r.data.city,
        board: r.data.board,
        contactKind: r.data.kind?.toLowerCase().replace(/\s+/g, "_"),
        source: source.trim().slice(0, 80) || "import",
      });
      if (res.created) created++;
      else merged++;
    } catch {
      skipped++;
    }
  }
  await audit("crm.import", "contacts", null, { created, merged, skipped, source });
  revalidatePath("/hq/crm/contacts");
  return { ok: true, message: `Imported: ${created} new, ${merged} matched existing contacts, ${skipped} skipped.`, created, merged, skipped };
}

// ---------------------------------------------------------------------------
// Campaigns and referral codes (marketing)
// ---------------------------------------------------------------------------

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Name the campaign").max(120),
  kind: z.enum(["creator", "school_outreach", "webinar", "ads", "event", "other"]),
  utm_campaign: z.preprocess((v) => (v === "" ? null : v), z.string().trim().regex(/^[a-z0-9_-]{2,60}$/, "UTM campaign: lowercase letters, numbers, - or _").nullable().optional()),
  spend_paise: z.coerce.number().int().min(0),
  starts_on: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable().optional()),
  ends_on: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable().optional()),
});

export async function saveCampaign(id: string | null, input: z.input<typeof campaignSchema>): Promise<Result> {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { staff, supabase } = await writer();
  const { data, error } = id
    ? await supabase.from("campaigns").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("campaigns").insert({ ...parsed.data, owner_id: staff.id }).select("id").single();
  if (error?.code === "23505") return { ok: false, error: "Another campaign uses that UTM name." };
  if (error || !data) return fail(error);
  return done(["/hq/crm/campaigns"], "Saved.", data.id);
}

const referralSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "Code: 3–24 letters, numbers or dashes"),
  contact_id: optionalId,
  campaign_id: optionalId,
  payout_percent: z.coerce.number().int().min(0).max(100),
  paid_out_paise: z.coerce.number().int().min(0),
  active: z.boolean(),
  note: optionalText(300),
});

export async function saveReferralCode(id: string | null, input: z.input<typeof referralSchema>): Promise<Result> {
  const parsed = referralSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase } = await writer();
  const { data, error } = id
    ? await supabase.from("referral_codes").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("referral_codes").insert(parsed.data).select("id").single();
  if (error?.code === "23505") return { ok: false, error: "That code is taken." };
  if (error || !data) return fail(error);
  if (id) await audit("referral.update", "referral_code", id, { paid_out_paise: parsed.data.paid_out_paise });
  return done(["/hq/crm/campaigns"], "Saved.", data.id);
}

/** Dedupe preview for an import: which rows match an existing contact (by email, then phone). */
export async function previewImport(rows: { email?: string; phone?: string }[]): Promise<{ matches: (string | null)[] }> {
  const { supabase } = await writer();
  const emails = [...new Set(rows.map((r) => normalizeEmail(r.email)).filter(Boolean))] as string[];
  const tails = [...new Set(rows.map((r) => normalizePhone(r.phone)?.slice(-4)).filter(Boolean))] as string[];
  const found: { id: string; name: string; email: string | null; phone: string | null }[] = [];
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await supabase.from("contacts").select("id, name, email, phone").in("email", emails.slice(i, i + 200));
    found.push(...(data ?? []));
  }
  if (tails.length) {
    const { data } = await supabase.from("contacts").select("id, name, email, phone").not("phone", "is", null).limit(5000);
    found.push(...(data ?? []).filter((c) => tails.includes(normalizePhone(c.phone)?.slice(-4) ?? "")));
  }
  return { matches: rows.map((r) => findDuplicate(r, found)?.name ?? null) };
}
