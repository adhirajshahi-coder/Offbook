/**
 * CRM rules (PRD §12.2–§12.4), pure and unit-tested: stale deals, the
 * weighted forecast, contact dedupe and business-day due dates.
 */

const DAY = 86_400_000;
const IST = 5.5 * 3_600_000;

export type DealLike = { status: "open" | "won" | "lost"; stage_changed_at: string; created_at?: string };

/**
 * An open deal is stale when it has no open next activity, or hasn't moved
 * stage for `staleDays` (default 14 for schools).
 */
export function staleReason(deal: DealLike, hasNextActivity: boolean, staleDays: number, now: Date): "no_next_activity" | "no_movement" | null {
  if (deal.status !== "open") return null;
  if (!hasNextActivity) return "no_next_activity";
  if (now.getTime() - new Date(deal.stage_changed_at).getTime() >= staleDays * DAY) return "no_movement";
  return null;
}

export const STALE_LABEL = { no_next_activity: "No next activity", no_movement: "No movement" } as const;

export type ForecastDeal = { value_paise: number; probability: number; expected_close: string | null; status: "open" | "won" | "lost" };

/** Weighted open pipeline by expected-close month (YYYY-MM); deals without a date go under "unscheduled". */
export function forecastByMonth(deals: ForecastDeal[]): { month: string; weighted: number; total: number; count: number }[] {
  const by = new Map<string, { weighted: number; total: number; count: number }>();
  for (const d of deals) {
    if (d.status !== "open") continue;
    const month = d.expected_close ? d.expected_close.slice(0, 7) : "unscheduled";
    const cur = by.get(month) ?? { weighted: 0, total: 0, count: 0 };
    cur.weighted += Math.round((d.value_paise * d.probability) / 100);
    cur.total += d.value_paise;
    cur.count += 1;
    by.set(month, cur);
  }
  return [...by.entries()].sort(([a], [b]) => (a === "unscheduled" ? 1 : b === "unscheduled" ? -1 : a.localeCompare(b))).map(([month, v]) => ({ month, ...v }));
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/** Digits only, Indian numbers reduced to their last 10 digits so +91 / 0 prefixes match. */
export function normalizePhone(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 8) return null;
  return d.length > 10 && (d.startsWith("91") || d.startsWith("0")) ? d.slice(-10) : d;
}

export type DedupeCandidate = { id: string; email: string | null; phone: string | null };

/** The existing contact this lead matches: by email first, then by phone. */
export function findDuplicate<T extends DedupeCandidate>(lead: { email?: string | null; phone?: string | null }, existing: T[]): T | null {
  const email = normalizeEmail(lead.email);
  const phone = normalizePhone(lead.phone);
  if (email) {
    const byEmail = existing.find((c) => normalizeEmail(c.email) === email);
    if (byEmail) return byEmail;
  }
  if (phone) return existing.find((c) => normalizePhone(c.phone) === phone) ?? null;
  return null;
}

/** Next business day (Mon–Fri, IST) at 18:00 IST, for "call within 1 business day". */
export function nextBusinessDayEvening(now: Date): Date {
  let local = new Date(now.getTime() + IST);
  do {
    local = new Date(local.getTime() + DAY);
  } while (local.getUTCDay() === 0 || local.getUTCDay() === 6);
  const ymd = local.toISOString().slice(0, 10);
  return new Date(`${ymd}T18:00:00+05:30`);
}

/** Round robin over a stable owner list. Returns the chosen owner and the next pointer. */
export function roundRobin<T>(owners: T[], pointer: number): { owner: T | null; next: number } {
  if (owners.length === 0) return { owner: null, next: pointer };
  const i = ((pointer % owners.length) + owners.length) % owners.length;
  return { owner: owners[i], next: i + 1 };
}

/** Map a CSV row to contact fields using a header → field mapping. */
export type ImportField = "name" | "email" | "phone" | "title" | "organization" | "city" | "board" | "kind" | "skip";

export function mapRow(row: Record<string, string>, mapping: Record<string, ImportField>): Partial<Record<Exclude<ImportField, "skip">, string>> {
  const out: Partial<Record<Exclude<ImportField, "skip">, string>> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (field === "skip") continue;
    const v = (row[header] ?? "").trim();
    if (v) out[field] = v.slice(0, 200);
  }
  return out;
}

/** Guess a mapping from common header names. */
export function guessMapping(headers: string[]): Record<string, ImportField> {
  const rules: [RegExp, ImportField][] = [
    [/e-?mail/i, "email"],
    [/phone|mobile|whatsapp|contact no/i, "phone"],
    [/school|organi[sz]ation|company|institution/i, "organization"],
    [/city|town|location/i, "city"],
    [/board|curriculum/i, "board"],
    [/title|designation|role|position/i, "title"],
    [/type|kind|category/i, "kind"],
    [/name/i, "name"],
  ];
  return Object.fromEntries(headers.map((h) => [h, rules.find(([re]) => re.test(h))?.[1] ?? "skip"]));
}

export const KIND_LABEL: Record<string, string> = {
  principal: "Principal",
  coordinator: "Coordinator",
  teacher: "Teacher",
  parent_lead: "Parent lead",
  creator: "Creator",
  partner: "Partner",
  other: "Other",
};
