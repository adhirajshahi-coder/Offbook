import "server-only";
import { requireStaff, type StaffRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** CRM readers: sales and marketing work it; ops and viewers read (PRD §12.10). */
export const CRM_READ: StaffRole[] = ["sales", "marketing", "ops", "viewer"];
export const CRM_WRITE: StaffRole[] = ["sales", "marketing"];

export async function crmStaff() {
  const staff = await requireStaff(CRM_READ);
  return { staff, canWrite: staff.role === "admin" || CRM_WRITE.includes(staff.role) };
}

/** Staff names for owner pickers and labels. Staff can only read their own row, so names come through the service role after the role check. */
export async function staffDirectory(): Promise<{ id: string; name: string; role: string }[]> {
  const { data } = await createAdminClient().from("staff").select("id, name, role").eq("active", true).order("name");
  return data ?? [];
}

/** People who can own CRM records and activities. */
export async function crmOwners() {
  return (await staffDirectory()).filter((s) => ["admin", "sales", "marketing", "ops"].includes(s.role));
}

export function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export type TimelineEvent = {
  at: string;
  kind: "activity" | "stage" | "payment" | "usage" | "created";
  title: string;
  detail?: string | null;
  activityType?: string;
  done?: boolean;
  id?: string;
};

/**
 * A record's timeline (PRD §12.1): activities, stage changes, payments, and
 * for families product usage. Read as the staff member (RLS).
 */
export async function timeline(opts: { contactId?: string; organizationId?: string; familyParentId?: string; dealIds?: string[] }): Promise<TimelineEvent[]> {
  const supabase = await createClient();
  const filters: string[] = [];
  if (opts.contactId) filters.push(`contact_id.eq.${opts.contactId}`);
  if (opts.organizationId) filters.push(`organization_id.eq.${opts.organizationId}`);
  if (opts.familyParentId) filters.push(`family_parent_id.eq.${opts.familyParentId}`);
  if (opts.dealIds?.length) filters.push(`deal_id.in.(${opts.dealIds.join(",")})`);
  const events: TimelineEvent[] = [];

  const [acts, stages] = await Promise.all([
    filters.length
      ? supabase.from("activities").select("id, type, subject, body, due_at, done_at, created_at").or(filters.join(",")).order("created_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    opts.dealIds?.length
      ? supabase.from("deal_stage_history").select("changed_at, from_stage, to_stage, deals(title), to:pipeline_stages!deal_stage_history_to_stage_fkey(name)").in("deal_id", opts.dealIds).order("changed_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  for (const a of acts.data ?? []) {
    events.push({
      at: a.done_at ?? a.due_at ?? a.created_at,
      kind: "activity",
      activityType: a.type,
      title: a.subject,
      detail: a.body,
      done: Boolean(a.done_at) || a.type === "note",
      id: a.id,
    });
  }
  for (const s of (stages.data ?? []) as unknown as { changed_at: string; from_stage: string | null; deals: { title: string } | null; to: { name: string } | null }[]) {
    events.push({ at: s.changed_at, kind: s.from_stage ? "stage" : "created", title: s.from_stage ? `${s.deals?.title}: moved to ${s.to?.name}` : `${s.deals?.title} created in ${s.to?.name}` });
  }

  if (opts.familyParentId) {
    const admin = createAdminClient();
    const [{ data: subs }, { data: kids }] = await Promise.all([
      supabase.from("subscriptions").select("status, starts_at, amount_paise, created_at, students(display_name)").eq("parent_id", opts.familyParentId),
      admin.from("students").select("id, display_name").eq("parent_id", opts.familyParentId).is("deleted_at", null),
    ]);
    for (const s of subs ?? []) {
      if (s.status === "pending") continue;
      events.push({
        at: s.starts_at ?? s.created_at,
        kind: "payment",
        title: `Paid ${rupees(s.amount_paise)} for ${(s.students as unknown as { display_name: string } | null)?.display_name ?? "a child"}`,
        detail: s.status !== "active" ? `Now ${s.status}` : null,
      });
    }
    // Weekly product usage per child: lessons completed.
    for (const k of kids ?? []) {
      const { data: done } = await admin.from("lesson_progress").select("completed_at").eq("student_id", k.id).not("completed_at", "is", null);
      const byWeek = new Map<string, number>();
      for (const d of done ?? []) {
        const wk = d.completed_at!.slice(0, 10);
        const monday = new Date(wk);
        monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
        const key = monday.toISOString().slice(0, 10);
        byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
      }
      for (const [week, n] of byWeek) events.push({ at: `${week}T12:00:00Z`, kind: "usage", title: `${k.display_name} completed ${n} ${n === 1 ? "lesson" : "lessons"} that week` });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export type CustomField = { id: string; object: string; key: string; label: string; type: "text" | "number" | "date" | "select" | "multi_select" | "url"; options: string[]; order_index: number };

export async function customFields(object: "contact" | "organization" | "deal" | "family"): Promise<CustomField[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("custom_fields").select("id, object, key, label, type, options, order_index").eq("object", object).order("order_index");
  return (data ?? []) as CustomField[];
}

export function customDisplay(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return Array.isArray(v) ? v.join(", ") : String(v);
}
