import "server-only";
import { istDay } from "@/lib/gamification/streaks";
import { SLA_HOURS } from "@/lib/hq/review";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * HQ reports (PRD §12.7). Each report returns stat tiles, single-series
 * charts and tables, from one set of filters, so the page and the CSV
 * export show the same numbers. Counts and sums only: no child names.
 * Reads use the service role after the caller's role check.
 */

export const REPORTS = [
  { key: "executive", label: "Executive" },
  { key: "sales", label: "Sales" },
  { key: "marketing", label: "Marketing" },
  { key: "operations", label: "Operations" },
  { key: "learning", label: "Learning" },
] as const;
export type ReportKey = (typeof REPORTS)[number]["key"];

export type Filters = { from: string; to: string; band: string; school: string; owner: string };
export type Tile = { label: string; value: string; hint?: string };
export type Chart = { title: string; format: "rupees" | "count" | "pct" | "hours"; data: { label: string; value: number }[] };
export type Table = { title: string; columns: string[]; rows: (string | number)[][] };
export type Report = { tiles: Tile[]; charts: Chart[]; tables: Table[]; notes?: string[] };

type Db = ReturnType<typeof createAdminClient>;
const DAY = 86_400_000;

export function defaultFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const s = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const today = istDay(new Date());
  const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  return {
    from: valid(s("from")) ? s("from") : istDay(new Date(new Date().getTime() - 89 * DAY)),
    to: valid(s("to")) ? s("to") : today,
    band: ["explore", "build", "launch"].includes(s("band")) ? s("band") : "",
    school: /^[0-9a-f-]{36}$/.test(s("school")) ? s("school") : "",
    owner: /^[0-9a-f-]{36}$/.test(s("owner")) ? s("owner") : "",
  };
}

const range = (f: Filters) => ({ from: `${f.from}T00:00:00+05:30`, to: `${f.to}T23:59:59+05:30` });
const inRange = (iso: string | null | undefined, f: Filters) => {
  if (!iso) return false;
  const { from, to } = range(f);
  const t = new Date(iso).getTime();
  return t >= new Date(from).getTime() && t <= new Date(to).getTime();
};
export const rupees = (p: number) => `₹${Math.round(p / 100).toLocaleString("en-IN")}`;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const pctNum = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const monthKey = (iso: string) => istDay(new Date(iso)).slice(0, 7);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

function months(f: Filters): string[] {
  const out: string[] = [];
  const d = new Date(`${f.from.slice(0, 7)}-01T00:00:00Z`);
  const end = f.to.slice(0, 7);
  while (d.toISOString().slice(0, 7) <= end && out.length < 36) {
    out.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/** Students matching the band/school filters (all non-deleted when unfiltered). */
async function studentScope(db: Db, f: Filters) {
  let q = db.from("students").select("id, parent_id, band, school_id, created_at, status").is("deleted_at", null);
  if (f.band) q = q.eq("band", f.band);
  if (f.school) q = q.eq("school_id", f.school);
  const { data } = await q;
  return data ?? [];
}

async function chunkedIn<T>(ids: string[], fetch: (chunk: string[]) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 300) out.push(...((await fetch(ids.slice(i, i + 300))).data ?? []));
  return out;
}

// ---------------------------------------------------------------------------

async function executive(db: Db, f: Filters): Promise<Report> {
  const students = await studentScope(db, f);
  const ids = students.map((s) => s.id);
  const [subs, lessons, missions, missionProgress] = await Promise.all([
    chunkedIn(ids, (c) => db.from("subscriptions").select("id, student_id, status, starts_at, ends_at, amount_paise").in("student_id", c).in("status", ["active", "expired", "refunded"])),
    db.from("lessons").select("id, mission_id"),
    db.from("missions").select("id"),
    chunkedIn(ids, (c) => db.from("mission_progress").select("student_id, mission_id, completed_at").in("student_id", c)),
  ]);
  const lp = await chunkedIn(ids, (c) => db.from("lesson_progress").select("student_id, lesson_id, started_at").in("student_id", c));
  const now = new Date().toISOString();
  const active = subs.filter((s) => s.status === "active" && s.ends_at && s.ends_at > now);
  const arr = active.reduce((n, s) => n + s.amount_paise, 0);
  const paidInRange = subs.filter((s) => s.status !== "refunded" && inRange(s.starts_at, f));
  const revenue = paidInRange.reduce((n, s) => n + s.amount_paise, 0);

  // Renewal rate: plans that ended in the period and were followed by another plan for the same child.
  const ended = subs.filter((s) => s.status !== "refunded" && inRange(s.ends_at, f) && s.ends_at! <= now);
  const renewed = ended.filter((s) => subs.some((o) => o.id !== s.id && o.student_id === s.student_id && o.starts_at && new Date(o.starts_at).getTime() >= new Date(s.ends_at!).getTime() - DAY));

  // Sprint (mission) completion: of missions started, how many were completed (PRD north-star).
  const missionOf = new Map((lessons.data ?? []).map((l) => [l.id, l.mission_id]));
  const started = new Set(lp.map((r) => `${r.student_id}:${missionOf.get(r.lesson_id)}`));
  const completed = missionProgress.filter((m) => m.completed_at && started.has(`${m.student_id}:${m.mission_id}`));

  const revenueByMonth = new Map<string, number>();
  const newByMonth = new Map<string, number>();
  for (const s of paidInRange) {
    const m = monthKey(s.starts_at!);
    revenueByMonth.set(m, (revenueByMonth.get(m) ?? 0) + s.amount_paise);
    newByMonth.set(m, (newByMonth.get(m) ?? 0) + 1);
  }
  const ms = months(f);
  return {
    tiles: [
      { label: "Active paying students", value: String(active.length) },
      { label: "ARR", value: rupees(arr), hint: `MRR-equivalent ${rupees(arr / 12)}` },
      { label: "Revenue in period", value: rupees(revenue) },
      { label: "New paid in period", value: String(paidInRange.length) },
      { label: "Renewal rate", value: pct(renewed.length, ended.length), hint: `${ended.length} plans ended in period` },
      { label: "Sprint completion (north star)", value: pct(completed.length, started.size), hint: `${completed.length} of ${started.size} missions started` },
      { label: "NPS", value: "—", hint: "Parent surveys aren't collected yet" },
      { label: "Missions in the catalogue", value: String((missions.data ?? []).length) },
    ],
    charts: [
      { title: "Revenue by month", format: "rupees", data: ms.map((m) => ({ label: monthLabel(m), value: revenueByMonth.get(m) ?? 0 })) },
      { title: "New paid students by month", format: "count", data: ms.map((m) => ({ label: monthLabel(m), value: newByMonth.get(m) ?? 0 })) },
    ],
    tables: [],
  };
}

async function sales(db: Db, f: Filters): Promise<Report> {
  let dq = db.from("deals").select("id, title, pipeline_id, stage_id, status, value_paise, owner_id, created_at, closed_at, stage_changed_at, pipelines(slug, stale_days), activities(due_at, done_at)");
  if (f.owner) dq = dq.eq("owner_id", f.owner);
  let aq = db.from("activities").select("owner_id, type, done_at").not("done_at", "is", null).gte("done_at", range(f).from).lte("done_at", range(f).to);
  if (f.owner) aq = aq.eq("owner_id", f.owner);
  const [{ data: dealsRaw }, { data: stages }, { data: acts }, { data: staff }, { data: history }] = await Promise.all([
    dq,
    db.from("pipeline_stages").select("id, name, order_index, pipeline_id, pipelines(slug, name)").order("order_index"),
    aq,
    db.from("staff").select("id, name"),
    db.from("deal_stage_history").select("deal_id, to_stage"),
  ]);
  const deals = dealsRaw ?? [];
  const name = new Map((staff ?? []).map((s) => [s.id, s.name]));
  const stageName = new Map((stages ?? []).map((s) => [s.id, s.name]));
  const open = deals.filter((d) => d.status === "open");
  const closed = deals.filter((d) => d.status !== "open" && inRange(d.closed_at, f));
  const won = closed.filter((d) => d.status === "won");
  const cycle = won.length ? won.reduce((n, d) => n + (new Date(d.closed_at!).getTime() - new Date(d.created_at).getTime()) / DAY, 0) / won.length : 0;
  const now = new Date();
  const stale = open.filter((d) => {
    const next = (d.activities as { due_at: string | null; done_at: string | null }[]).some((a) => !a.done_at && a.due_at);
    const days = (d.pipelines as unknown as { stale_days: number }).stale_days;
    return !next || now.getTime() - new Date(d.stage_changed_at).getTime() >= days * DAY;
  });

  // Pilot → paid: school deals that ever reached a pilot stage, and of those how many reached Paid.
  const schoolStages = (stages ?? []).filter((s) => (s.pipelines as unknown as { slug: string }).slug === "schools");
  const pilotIds = new Set(schoolStages.filter((s) => /pilot/i.test(s.name)).map((s) => s.id));
  const paidIds = new Set(schoolStages.filter((s) => /^paid/i.test(s.name)).map((s) => s.id));
  const dealIds = new Set(deals.map((d) => d.id));
  const piloted = new Set((history ?? []).filter((h) => dealIds.has(h.deal_id) && pilotIds.has(h.to_stage)).map((h) => h.deal_id));
  const pilotPaid = [...piloted].filter((id) => (history ?? []).some((h) => h.deal_id === id && paidIds.has(h.to_stage)));

  const byStage = schoolStages.map((s) => ({ label: s.name, value: open.filter((d) => d.stage_id === s.id).reduce((n, d) => n + d.value_paise, 0) }));
  const perOwner = new Map<string, number>();
  for (const a of acts ?? []) perOwner.set(a.owner_id ?? "none", (perOwner.get(a.owner_id ?? "none") ?? 0) + 1);
  const revenueByOwner = new Map<string, number>();
  for (const d of won) revenueByOwner.set(d.owner_id ?? "none", (revenueByOwner.get(d.owner_id ?? "none") ?? 0) + d.value_paise);
  const label = (id: string) => (id === "none" ? "Unassigned" : (name.get(id) ?? "Former staff"));

  return {
    tiles: [
      { label: "Open pipeline value", value: rupees(open.reduce((n, d) => n + d.value_paise, 0)), hint: `${open.length} open deals` },
      { label: "Win rate", value: pct(won.length, closed.length), hint: `${won.length} won of ${closed.length} closed in period` },
      { label: "Sales cycle", value: won.length ? `${Math.round(cycle)} days` : "—", hint: "Created to won, average" },
      { label: "Stale deals", value: String(stale.length) },
      { label: "School pilot → paid", value: pct(pilotPaid.length, piloted.size), hint: `${pilotPaid.length} of ${piloted.size} pilots` },
      { label: "Activities logged", value: String((acts ?? []).length), hint: "Done in period" },
    ],
    charts: [{ title: "Open Schools pipeline by stage", format: "rupees", data: byStage }],
    tables: [
      { title: "Activities and revenue by owner", columns: ["Owner", "Activities done", "Won revenue"], rows: [...new Set([...perOwner.keys(), ...revenueByOwner.keys()])].map((id) => [label(id), perOwner.get(id) ?? 0, rupees(revenueByOwner.get(id) ?? 0)]) },
      { title: "Stale deals", columns: ["Deal", "Stage", "Owner", "Value"], rows: stale.slice(0, 50).map((d) => [d.title, stageName.get(d.stage_id) ?? "", label(d.owner_id ?? "none"), rupees(d.value_paise)]) },
    ],
  };
}

async function marketing(db: Db, f: Filters): Promise<Report> {
  const students = await studentScope(db, f);
  const scoped = f.band || f.school ? new Set(students.map((s) => s.parent_id)) : null;
  const [{ data: contacts }, { data: parentsRaw }, { data: staff }, { data: subs }, { data: campaigns }, { data: codes }] = await Promise.all([
    db.from("contacts").select("source, created_at").gte("created_at", range(f).from).lte("created_at", range(f).to),
    db.from("parents").select("id, created_at, signup_utm, referral_code_id"),
    db.from("staff").select("id"),
    db.from("subscriptions").select("parent_id, student_id, status, starts_at, ends_at, amount_paise, referral_code_id").in("status", ["active", "expired"]),
    db.from("campaigns").select("name, utm_campaign, spend_paise, starts_on, ends_on"),
    db.from("referral_codes").select("id, code"),
  ]);
  const staffIds = new Set((staff ?? []).map((s) => s.id));
  const parents = (parentsRaw ?? []).filter((p) => !staffIds.has(p.id) && (!scoped || scoped.has(p.id)));
  const signups = parents.filter((p) => inRange(p.created_at, f));
  const signupIds = new Set(signups.map((p) => p.id));
  const kids = students.filter((s) => signupIds.has(s.parent_id));
  const kidIds = kids.map((k) => k.id);
  const [lp, mp] = await Promise.all([
    chunkedIn(kidIds, (c) => db.from("lesson_progress").select("student_id").in("student_id", c)),
    chunkedIn(kidIds, (c) => db.from("mission_progress").select("student_id, completed_at").in("student_id", c).not("completed_at", "is", null)),
  ]);
  const parentOf = new Map(kids.map((k) => [k.id, k.parent_id]));
  const paidParents = new Set((subs ?? []).filter((s) => signupIds.has(s.parent_id)).map((s) => s.parent_id));
  const renewedParents = new Set(
    (subs ?? []).filter((s) => signupIds.has(s.parent_id) && (subs ?? []).some((o) => o.student_id === s.student_id && o.starts_at && s.ends_at && o.starts_at >= s.ends_at)).map((s) => s.parent_id),
  );
  const funnel = [
    { label: "Signed up", value: signups.length },
    { label: "Child profile", value: new Set(kids.map((k) => k.parent_id)).size },
    { label: "First lesson", value: new Set(lp.map((r) => parentOf.get(r.student_id))).size },
    { label: "First mission", value: new Set(mp.map((r) => parentOf.get(r.student_id))).size },
    { label: "Paid", value: paidParents.size },
    { label: "Renewed", value: renewedParents.size },
  ];

  const bySource = new Map<string, { leads: number; signups: number; paid: number }>();
  const bump = (k: string, field: "leads" | "signups" | "paid") => {
    const cur = bySource.get(k) ?? { leads: 0, signups: 0, paid: 0 };
    cur[field]++;
    bySource.set(k, cur);
  };
  for (const c of contacts ?? []) bump(c.source ?? "unknown", "leads");
  const codeName = new Map((codes ?? []).map((c) => [c.id, c.code]));
  for (const p of signups) {
    const utm = (p.signup_utm ?? {}) as Record<string, string>;
    const src = p.referral_code_id ? `referral:${codeName.get(p.referral_code_id)}` : (utm.utm_source ?? "direct");
    bump(src, "signups");
    if (paidParents.has(p.id)) bump(src, "paid");
  }
  const newPaidInRange = (subs ?? []).filter((s) => inRange(s.starts_at, f) && (!scoped || scoped.has(s.parent_id)));
  const spend = (campaigns ?? []).filter((c) => (!c.ends_on || c.ends_on >= f.from) && (!c.starts_on || c.starts_on <= f.to)).reduce((n, c) => n + c.spend_paise, 0);
  const referralRevenue = newPaidInRange.filter((s) => s.referral_code_id).reduce((n, s) => n + s.amount_paise, 0);

  return {
    tiles: [
      { label: "Leads", value: String((contacts ?? []).length), hint: "New CRM contacts in period" },
      { label: "Sign-ups", value: String(signups.length) },
      { label: "Sign-up → paid", value: pct(paidParents.size, signups.length) },
      { label: "Spend (manual)", value: rupees(spend), hint: "Campaigns active in period" },
      { label: "CAC per paid family", value: newPaidInRange.length ? rupees(spend / new Set(newPaidInRange.map((s) => s.parent_id)).size) : "—" },
      { label: "Referral revenue", value: rupees(referralRevenue) },
    ],
    charts: [{ title: "Funnel: families who signed up in the period", format: "count", data: funnel }],
    tables: [
      {
        title: "Leads, sign-ups and paid by source",
        columns: ["Source", "Leads", "Sign-ups", "Paid"],
        rows: [...bySource.entries()].sort((a, b) => b[1].leads + b[1].signups - (a[1].leads + a[1].signups)).map(([k, v]) => [k, v.leads, v.signups, v.paid]),
      },
    ],
    notes: ["Website visits aren't counted: there's no analytics tool on the site (D-024). The funnel starts at sign-up."],
  };
}

async function operations(db: Db, f: Filters): Promise<Report> {
  const [{ data: subs }, { data: pending }, { data: lessons }, { data: steps }] = await Promise.all([
    db.from("submissions").select("kind, status, created_at, reviewed_at").in("kind", ["capstone", "challenge"]).not("reviewed_at", "is", null).gte("reviewed_at", range(f).from).lte("reviewed_at", range(f).to),
    db.from("submissions").select("created_at").eq("status", "pending").in("kind", ["capstone", "challenge"]),
    db.from("lessons").select("id, title, status"),
    db.from("lesson_steps").select("id, lesson_id, order_index, type"),
  ]);
  const hours = (subs ?? []).map((s) => (new Date(s.reviewed_at!).getTime() - new Date(s.created_at).getTime()) / 3_600_000);
  const within = hours.filter((h) => h <= SLA_HOURS).length;
  const oldest = (pending ?? []).map((p) => (new Date().getTime() - new Date(p.created_at).getTime()) / 3_600_000).sort((a, b) => b - a)[0];
  const published = (lessons ?? []).filter((l) => l.status === "published");
  const stepCount = new Map<string, number>();
  for (const s of steps ?? []) stepCount.set(s.lesson_id, (stepCount.get(s.lesson_id) ?? 0) + 1);
  const thin = published.filter((l) => (stepCount.get(l.id) ?? 0) < 4);

  return {
    tiles: [
      { label: "Reviewed in period", value: String(hours.length) },
      { label: `Within ${SLA_HOURS} h`, value: pct(within, hours.length) },
      { label: "Median review time", value: hours.length ? `${Math.round(hours.sort((a, b) => a - b)[Math.floor(hours.length / 2)])} h` : "—" },
      { label: "Waiting now", value: String((pending ?? []).length), hint: oldest ? `Oldest ${Math.round(oldest)} h` : undefined },
      { label: "Published lessons", value: String(published.length), hint: thin.length ? `${thin.length} with fewer than 4 steps` : undefined },
      { label: "Support backlog", value: "—", hint: "Support inbox arrives in a later phase" },
    ],
    charts: [
      {
        title: "Review time distribution (hours)",
        format: "count",
        data: [
          ["< 12 h", (h: number) => h < 12],
          ["12–24 h", (h: number) => h >= 12 && h < 24],
          ["24–36 h", (h: number) => h >= 24 && h < 36],
          ["36–48 h", (h: number) => h >= 36 && h < 48],
          ["> 48 h", (h: number) => h >= 48],
        ].map(([label, test]) => ({ label: label as string, value: hours.filter(test as (h: number) => boolean).length })),
      },
    ],
    tables: thin.length ? [{ title: "Content health: thin lessons", columns: ["Lesson", "Steps"], rows: thin.map((l) => [l.title, stepCount.get(l.id) ?? 0]) }] : [],
    notes: ["Live sessions aren't scheduled in the product yet, so attendance isn't reported."],
  };
}

async function learning(db: Db, f: Filters): Promise<Report> {
  const students = await studentScope(db, f);
  const ids = students.map((s) => s.id);
  const [lp, cp, mastery, games, perms, chSubs, xp, stepsRaw, { data: courses }, { data: skills }, { data: gameRows }] = await Promise.all([
    chunkedIn(ids, (c) => db.from("lesson_progress").select("student_id, lesson_id, started_at, completed_at").in("student_id", c)),
    chunkedIn(ids, (c) => db.from("course_progress").select("student_id, course_id, status").in("student_id", c)),
    chunkedIn(ids, (c) => db.from("skill_mastery").select("skill_id, level").in("student_id", c)),
    chunkedIn(ids, (c) => db.from("game_sessions").select("game_id, won, status, started_at").in("student_id", c).gte("started_at", range(f).from).lte("started_at", range(f).to)),
    chunkedIn(ids, (c) => db.from("challenge_permissions").select("student_id").in("student_id", c)),
    chunkedIn(ids, (c) => db.from("submissions").select("student_id, status").eq("kind", "challenge").in("student_id", c)),
    chunkedIn(ids, (c) => db.from("xp_events").select("student_id, created_at").in("student_id", c).gte("created_at", new Date(new Date().getTime() - 7 * DAY).toISOString())),
    chunkedIn(ids, (c) => db.from("step_progress").select("step_id, completed_at").in("student_id", c)),
    db.from("courses").select("id, short_title, title"),
    db.from("skills").select("id, name"),
    db.from("games").select("id, title"),
  ]);
  // Activation: started a lesson within 7 days of profile creation (cohort: profiles created in period).
  const cohort = students.filter((s) => inRange(s.created_at, f));
  const firstStart = new Map<string, string>();
  for (const r of lp) if (!firstStart.has(r.student_id) || r.started_at < firstStart.get(r.student_id)!) firstStart.set(r.student_id, r.started_at);
  const activated = cohort.filter((s) => firstStart.has(s.id) && new Date(firstStart.get(s.id)!).getTime() - new Date(s.created_at).getTime() <= 7 * DAY);

  const bandOf = new Map(students.map((s) => [s.id, s.band]));
  const courseName = new Map((courses ?? []).map((c) => [c.id, c.short_title ?? c.title]));
  const completion = new Map<string, Record<string, { started: number; done: number }>>();
  for (const r of cp) {
    const row = completion.get(r.course_id) ?? {};
    const band = bandOf.get(r.student_id) ?? "?";
    const cell = row[band] ?? { started: 0, done: 0 };
    cell.started++;
    if (r.status === "completed") cell.done++;
    row[band] = cell;
    completion.set(r.course_id, row);
  }

  // Step-level drop-off: completions per step position across lessons students started.
  const { data: steps } = await db.from("lesson_steps").select("id, order_index");
  const position = new Map((steps ?? []).map((s) => [s.id, s.order_index]));
  const byPos = new Map<number, number>();
  for (const s of stepsRaw) if (s.completed_at) byPos.set(position.get(s.step_id) ?? 0, (byPos.get(position.get(s.step_id) ?? 0) ?? 0) + 1);
  const positions = [...byPos.keys()].sort((a, b) => a - b).slice(0, 12);

  const levels = [0, 1, 2, 3].map((l) => mastery.filter((m) => m.level === l).length);
  const skillName = new Map((skills ?? []).map((s) => [s.id, s.name]));
  const mastered = new Map<string, number>();
  for (const m of mastery) if (m.level >= 3) mastered.set(m.skill_id, (mastered.get(m.skill_id) ?? 0) + 1);

  const activeDays = new Map<string, Set<string>>();
  for (const e of xp) activeDays.set(e.student_id, (activeDays.get(e.student_id) ?? new Set()).add(istDay(new Date(e.created_at))));
  const streak = [0, 1, 2, 3, 4, 5, 6, 7].map((d) => ({ label: `${d} ${d === 1 ? "day" : "days"}`, value: ids.filter((id) => (activeDays.get(id)?.size ?? 0) === d).length }));

  const gameTitle = new Map((gameRows ?? []).map((g) => [g.id, g.title]));
  const gameStats = new Map<string, { plays: number; wins: number }>();
  for (const g of games) {
    const cur = gameStats.get(g.game_id) ?? { plays: 0, wins: 0 };
    if (g.status === "finished") {
      cur.plays++;
      if (g.won) cur.wins++;
    }
    gameStats.set(g.game_id, cur);
  }

  return {
    tiles: [
      { label: "Learners in scope", value: String(ids.length) },
      { label: "Activation (week 1)", value: pct(activated.length, cohort.length), hint: `${cohort.length} profiles created in period` },
      { label: "Weekly active learners", value: String(activeDays.size), hint: "Any XP in the last 7 days" },
      { label: "Lessons completed", value: String(lp.filter((r) => inRange(r.completed_at, f)).length), hint: "In period" },
      { label: "Challenge participation", value: String(new Set(perms.map((p) => p.student_id)).size), hint: `${chSubs.filter((s) => s.status === "approved").length} approved submissions` },
      { label: "Game plays", value: String(games.filter((g) => g.status === "finished").length), hint: "In period" },
    ],
    charts: [
      { title: "Active days in the last 7 (learners)", format: "count", data: streak },
      { title: "Step completions by step position", format: "count", data: positions.map((p) => ({ label: `Step ${p + 1}`, value: byPos.get(p) ?? 0 })) },
      { title: "Skill mastery levels (all skills)", format: "count", data: ["Attempted", "Familiar", "Proficient", "Mastered"].map((l, i) => ({ label: l, value: levels[i] })) },
    ],
    tables: [
      {
        title: "Completion by course and band",
        columns: ["Course", "Explore", "Build", "Launch"],
        rows: [...completion.entries()].map(([id, row]) => [courseName.get(id) ?? "Course", ...["explore", "build", "launch"].map((b) => (row[b] ? `${row[b].done}/${row[b].started} (${pct(row[b].done, row[b].started)})` : "—"))]),
      },
      { title: "Most-mastered skills", columns: ["Skill", "Learners mastered"], rows: [...mastered.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => [skillName.get(id) ?? "Skill", n]) },
      { title: "Game usage", columns: ["Game", "Plays", "Win rate"], rows: [...gameStats.entries()].map(([id, g]) => [gameTitle.get(id) ?? "Game", g.plays, `${pctNum(g.wins, g.plays)}%`]) },
    ],
  };
}

export async function runReport(key: ReportKey, f: Filters): Promise<Report> {
  const db = createAdminClient();
  switch (key) {
    case "executive":
      return executive(db, f);
    case "sales":
      return sales(db, f);
    case "marketing":
      return marketing(db, f);
    case "operations":
      return operations(db, f);
    case "learning":
      return learning(db, f);
  }
}

/** One CSV per report: tiles, then each chart's data, then each table. */
export function reportCsv(r: Report): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = ["Metric,Value,Note", ...r.tiles.map((t) => [t.label, t.value, t.hint ?? ""].map(esc).join(","))];
  for (const c of r.charts) lines.push("", esc(c.title), "Label,Value", ...c.data.map((d) => [d.label, c.format === "rupees" ? Math.round(d.value / 100) : d.value].map(esc).join(",")));
  for (const t of r.tables) lines.push("", esc(t.title), t.columns.map(esc).join(","), ...t.rows.map((row) => row.map(esc).join(",")));
  return lines.join("\n");
}
