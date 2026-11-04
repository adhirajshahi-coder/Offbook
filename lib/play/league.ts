import "server-only";
import { cohortSizes, LEAGUE_MAX, nextTier, outcomeFor, rankStandings, type Outcome, type Tier } from "@/lib/gamification/leagues";
import { istWeekStart } from "@/lib/gamification/streaks";
import { STICKERS, type Sticker } from "@/lib/play/league-stickers";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Weekly leagues (PRD §7.8). Membership is created by the Monday rollover
 * for every opted-in child, or on first visit mid-week. Weekly XP is read
 * live from the ledger; rollover freezes ranks and outcomes.
 */

type Db = ReturnType<typeof createAdminClient>;


function addDays(ymd: string, days: number): string {
  return new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export function weekRange(weekStart: string): { from: string; to: string } {
  return { from: `${weekStart}T00:00:00+05:30`, to: `${addDays(weekStart, 7)}T00:00:00+05:30` };
}

async function weeklyXp(db: Db, ids: string[], weekStart: string): Promise<Map<string, number>> {
  const xp = new Map(ids.map((id) => [id, 0]));
  if (!ids.length) return xp;
  const { from, to } = weekRange(weekStart);
  const { data } = await db.from("xp_events").select("student_id, amount").in("student_id", ids).gte("created_at", from).lt("created_at", to);
  for (const e of data ?? []) xp.set(e.student_id, (xp.get(e.student_id) ?? 0) + e.amount);
  return xp;
}

/** The tier a student plays this week: where last week's result put them. */
async function currentTier(db: Db, studentId: string, weekStart: string): Promise<Tier> {
  const { data } = await db
    .from("league_members")
    .select("tier, outcome")
    .eq("student_id", studentId)
    .lt("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? nextTier(data.tier as Tier, data.outcome as Outcome | null) : "bronze";
}

/** Put a student in this week's league for their band and tier, creating one if every league is full. */
async function joinLeague(db: Db, student: { id: string; band: string }, weekStart: string): Promise<string> {
  const tier = await currentTier(db, student.id, weekStart);
  const { data: leagues } = await db.from("leagues").select("id, league_members(count)").eq("week_start", weekStart).eq("band", student.band).eq("tier", tier);
  const open = (leagues ?? []).find((l) => ((l.league_members as unknown as { count: number }[])[0]?.count ?? 0) < LEAGUE_MAX);
  let leagueId = open?.id as string | undefined;
  if (!leagueId) {
    const { data, error } = await db.from("leagues").insert({ week_start: weekStart, band: student.band, tier }).select("id").single();
    if (error || !data) throw new Error("Couldn't create a league");
    leagueId = data.id;
  }
  const { error } = await db.from("league_members").insert({ league_id: leagueId, student_id: student.id, week_start: weekStart, tier });
  if (error && error.code !== "23505") throw new Error(error.message);
  const { data: mine } = await db.from("league_members").select("league_id").eq("student_id", student.id).eq("week_start", weekStart).single();
  return mine!.league_id;
}

export type LeagueRow = { studentId: string; name: string; xp: number; rank: number; me: boolean; zone: Outcome; reactions: Partial<Record<Sticker, number>>; sentByMe: Sticker[] };

export type LeagueView = { tier: Tier; weekStart: string; endsAt: string; rows: LeagueRow[] };

export async function loadLeague(student: { id: string; band: string }, now = new Date()): Promise<LeagueView> {
  const db = createAdminClient();
  const weekStart = istWeekStart(now);
  const { data: existing } = await db.from("league_members").select("league_id").eq("student_id", student.id).eq("week_start", weekStart).maybeSingle();
  const leagueId = existing?.league_id ?? (await joinLeague(db, student, weekStart));

  const [{ data: league }, { data: members }, { data: reactions }] = await Promise.all([
    db.from("leagues").select("tier").eq("id", leagueId).single(),
    db.from("league_members").select("student_id, students(display_name)").eq("league_id", leagueId),
    db.from("league_reactions").select("from_student, to_student, sticker").eq("league_id", leagueId),
  ]);
  const tier = (league?.tier ?? "bronze") as Tier;
  const ids = (members ?? []).map((m) => m.student_id);
  const xp = await weeklyXp(db, ids, weekStart);
  const name = new Map((members ?? []).map((m) => [m.student_id, (m.students as unknown as { display_name: string } | null)?.display_name ?? "Player"]));
  const ranked = rankStandings(ids.map((id) => ({ studentId: id, xp: xp.get(id) ?? 0 })));

  return {
    tier,
    weekStart,
    endsAt: weekRange(weekStart).to,
    rows: ranked.map((r) => {
      const mine = (reactions ?? []).filter((x) => x.to_student === r.studentId);
      const counts: Partial<Record<Sticker, number>> = {};
      for (const x of mine) counts[x.sticker as Sticker] = (counts[x.sticker as Sticker] ?? 0) + 1;
      return {
        studentId: r.studentId,
        name: name.get(r.studentId) ?? "Player",
        xp: r.xp,
        rank: r.rank,
        me: r.studentId === student.id,
        zone: outcomeFor(r.rank, ranked.length, tier),
        reactions: counts,
        sentByMe: mine.filter((x) => x.from_student === student.id).map((x) => x.sticker as Sticker),
      };
    }),
  };
}

export async function sendReaction(fromId: string, toId: string, sticker: Sticker, now = new Date()): Promise<boolean> {
  if (fromId === toId || !STICKERS.includes(sticker)) return false;
  const db = createAdminClient();
  const weekStart = istWeekStart(now);
  const { data: rows } = await db.from("league_members").select("student_id, league_id").eq("week_start", weekStart).in("student_id", [fromId, toId]);
  const from = rows?.find((r) => r.student_id === fromId);
  const to = rows?.find((r) => r.student_id === toId);
  if (!from || !to || from.league_id !== to.league_id) return false;
  const { error } = await db.from("league_reactions").insert({ league_id: from.league_id, from_student: fromId, to_student: toId, sticker });
  return !error || error.code === "23505";
}

export type RolloverReport = { week: string; leaguesClosed: number; newWeek: string; leaguesCreated: number; placed: number };

/**
 * Monday job: freeze last week's ranks and outcomes, then place every
 * opted-in active child into this week's cohorts. Safe to run twice.
 */
export async function rollover(now = new Date()): Promise<RolloverReport> {
  const db = createAdminClient();
  const thisWeek = istWeekStart(now);
  const lastWeek = addDays(thisWeek, -7);

  // 1. Close last week.
  const { data: oldLeagues } = await db.from("leagues").select("id, tier").eq("week_start", lastWeek);
  let leaguesClosed = 0;
  for (const l of oldLeagues ?? []) {
    const { data: members } = await db.from("league_members").select("student_id, final_rank").eq("league_id", l.id);
    if (!members?.length || members.every((m) => m.final_rank !== null)) continue;
    const xp = await weeklyXp(db, members.map((m) => m.student_id), lastWeek);
    const ranked = rankStandings(members.map((m) => ({ studentId: m.student_id, xp: xp.get(m.student_id) ?? 0 })));
    await Promise.all(
      ranked.map((r) =>
        db
          .from("league_members")
          .update({ weekly_xp: r.xp, final_rank: r.rank, outcome: outcomeFor(r.rank, ranked.length, l.tier as Tier) })
          .eq("league_id", l.id)
          .eq("student_id", r.studentId),
      ),
    );
    leaguesClosed++;
  }

  // 2. Open this week for everyone opted in and not placed yet.
  const [{ data: students }, { data: placed }] = await Promise.all([
    db.from("students").select("id, band").eq("league_opt_in", true).eq("status", "active").is("deleted_at", null),
    db.from("league_members").select("student_id").eq("week_start", thisWeek),
  ]);
  const already = new Set((placed ?? []).map((p) => p.student_id));
  const todo = (students ?? []).filter((s) => !already.has(s.id));
  const groups = new Map<string, string[]>();
  for (const s of todo) {
    const tier = await currentTier(db, s.id, thisWeek);
    const key = `${s.band}|${tier}`;
    groups.set(key, [...(groups.get(key) ?? []), s.id]);
  }
  let leaguesCreated = 0;
  for (const [key, ids] of groups) {
    const [band, tier] = key.split("|");
    let offset = 0;
    for (const size of cohortSizes(ids.length)) {
      const { data: league } = await db.from("leagues").insert({ week_start: thisWeek, band, tier }).select("id").single();
      if (!league) continue;
      leaguesCreated++;
      await db.from("league_members").insert(ids.slice(offset, offset + size).map((id) => ({ league_id: league.id, student_id: id, week_start: thisWeek, tier })));
      offset += size;
    }
  }
  return { week: lastWeek, leaguesClosed, newWeek: thisWeek, leaguesCreated, placed: todo.length };
}
