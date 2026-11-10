import "server-only";
import { findDuplicate, nextBusinessDayEvening, normalizeEmail, normalizePhone, roundRobin } from "@/lib/crm/rules";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Lead capture (PRD §12.3): a marketing form or CSV row becomes a Contact
 * (deduped by email, then phone), plus an Organization and a Schools deal
 * when it's a school. New contacts get an owner by round robin; a new school
 * lead gets a "Call within 1 business day" task (PRD §12.8).
 */

type Db = ReturnType<typeof createAdminClient>;

export type LeadInput = {
  kind: "school_pilot" | "demo" | "newsletter" | "import";
  name: string;
  email?: string | null;
  phone?: string | null;
  organization?: string | null;
  city?: string | null;
  board?: string | null;
  title?: string | null;
  contactKind?: string | null;
  message?: string | null;
  utm?: Record<string, string>;
  referrer?: string | null;
  source?: string | null;
};

export type LeadResult = { contactId: string; created: boolean; dealId: string | null };

const BOARDS = ["CBSE", "ICSE", "State", "IB", "IGCSE", "Other"];

/** Sales staff in a stable order, falling back to admins so leads are never unowned. */
export async function salesOwners(db: Db): Promise<string[]> {
  const { data } = await db.from("staff").select("id, role").eq("active", true).in("role", ["sales", "admin"]).order("created_at");
  const sales = (data ?? []).filter((s) => s.role === "sales").map((s) => s.id);
  return sales.length ? sales : (data ?? []).map((s) => s.id);
}

export async function nextOwner(db: Db): Promise<string | null> {
  const owners = await salesOwners(db);
  const { data } = await db.from("crm_state").select("value").eq("key", "round_robin").maybeSingle();
  const { owner, next } = roundRobin(owners, Number((data?.value as { next?: number } | null)?.next ?? 0));
  await db.from("crm_state").upsert({ key: "round_robin", value: { next }, updated_at: new Date().toISOString() });
  return owner;
}

async function campaignFor(db: Db, utm: Record<string, string> | undefined): Promise<string | null> {
  const name = utm?.utm_campaign;
  if (!name) return null;
  const { data } = await db.from("campaigns").select("id").eq("utm_campaign", name).maybeSingle();
  return data?.id ?? null;
}

function sourceOf(input: LeadInput): string {
  if (input.source) return input.source;
  if (input.utm?.ref) return `referral:${input.utm.ref}`;
  if (input.utm?.utm_source) return input.utm.utm_source;
  if (input.referrer) {
    try {
      return new URL(input.referrer).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  return input.kind === "import" ? "import" : "website";
}

async function findContact(db: Db, email: string | null, phone: string | null) {
  if (!email && !phone) return null;
  const cols = "id, email, phone, organization_id, owner_id";
  const [byEmail, byPhone] = await Promise.all([
    email ? db.from("contacts").select(cols).eq("email", email).limit(1) : Promise.resolve({ data: [] }),
    // Narrow by the last 4 digits (stored numbers may contain spaces), then compare normalised numbers in code.
    phone ? db.from("contacts").select(cols).like("phone", `%${phone.slice(-4)}`).limit(50) : Promise.resolve({ data: [] }),
  ]);
  return findDuplicate({ email, phone }, [...(byEmail.data ?? []), ...(byPhone.data ?? [])]);
}

async function findOrCreateOrg(db: Db, input: LeadInput, ownerId: string | null): Promise<string | null> {
  const name = input.organization?.trim();
  if (!name) return null;
  const { data: existing } = await db.from("organizations").select("id").ilike("name", name).limit(1).maybeSingle();
  if (existing) return existing.id;
  const board = BOARDS.find((b) => b.toLowerCase() === input.board?.trim().toLowerCase()) ?? null;
  const { data } = await db
    .from("organizations")
    .insert({ name: name.slice(0, 160), kind: "school", city: input.city?.slice(0, 60) ?? null, board, owner_id: ownerId })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function captureLead(input: LeadInput, now = new Date()): Promise<LeadResult> {
  const db = createAdminClient();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone) ? input.phone!.trim().slice(0, 20) : null;
  const existing = await findContact(db, email, normalizePhone(phone));
  const ownerId = existing?.owner_id ?? (await nextOwner(db));
  const [orgId, campaignId] = await Promise.all([findOrCreateOrg(db, input, ownerId), campaignFor(db, input.utm)]);
  const isSchool = input.kind === "school_pilot" || (input.kind === "demo" && Boolean(orgId)) || (input.kind === "import" && Boolean(orgId));

  let contactId: string;
  let created = false;
  if (existing) {
    contactId = existing.id;
    // Fill gaps only; never overwrite what sales already know.
    const patch: Record<string, unknown> = {};
    if (!existing.email && email) patch.email = email;
    if (!existing.phone && phone) patch.phone = phone;
    if (!existing.organization_id && orgId) patch.organization_id = orgId;
    if (Object.keys(patch).length) await db.from("contacts").update(patch).eq("id", contactId);
  } else {
    const kind = input.contactKind && ["principal", "coordinator", "teacher", "parent_lead", "creator", "partner", "other"].includes(input.contactKind) ? input.contactKind : isSchool ? "coordinator" : "parent_lead";
    const { data, error } = await db
      .from("contacts")
      .insert({
        name: input.name.slice(0, 120),
        email,
        phone,
        title: input.title?.slice(0, 80) ?? null,
        kind,
        organization_id: orgId,
        owner_id: ownerId,
        source: sourceOf(input),
        campaign_id: campaignId,
        utm: input.utm ?? {},
        referrer: input.referrer ?? null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Couldn't create contact");
    contactId = data.id;
    created = true;
  }

  // Note what they asked for on the timeline.
  if (input.message?.trim() || input.kind !== "import") {
    await db.from("activities").insert({
      type: "note",
      subject: input.kind === "school_pilot" ? "Asked for a school pilot" : input.kind === "demo" ? "Booked a demo" : input.kind === "newsletter" ? "Joined the newsletter" : "Imported",
      body: input.message?.slice(0, 4000) ?? null,
      contact_id: contactId,
      organization_id: orgId,
      owner_id: ownerId,
      done_at: now.toISOString(),
    });
  }

  let dealId: string | null = null;
  if (isSchool && orgId) {
    const { data: open } = await db.from("deals").select("id").eq("organization_id", orgId).eq("status", "open").limit(1).maybeSingle();
    if (open) dealId = open.id;
    else {
      const { data: pipeline } = await db.from("pipelines").select("id, pipeline_stages(id, order_index)").eq("slug", "schools").single();
      const first = (pipeline?.pipeline_stages as { id: string; order_index: number }[] | undefined)?.sort((a, b) => a.order_index - b.order_index)[0];
      if (pipeline && first) {
        const { data: deal } = await db
          .from("deals")
          .insert({
            pipeline_id: pipeline.id,
            stage_id: first.id,
            title: `${input.organization} pilot`.slice(0, 160),
            organization_id: orgId,
            contact_id: contactId,
            owner_id: ownerId,
            source: sourceOf(input),
            campaign_id: campaignId,
          })
          .select("id")
          .single();
        dealId = deal?.id ?? null;
        if (dealId && input.kind !== "import") {
          await db.from("activities").insert({
            type: "task",
            subject: "Call within 1 business day",
            body: `New school lead from the website: ${input.name}${input.title ? `, ${input.title}` : ""}.`,
            due_at: nextBusinessDayEvening(now).toISOString(),
            owner_id: ownerId,
            deal_id: dealId,
            contact_id: contactId,
            organization_id: orgId,
            automation_key: `new-school-lead:${dealId}`,
          });
        }
      }
    }
  }
  return { contactId, created, dealId };
}
