import { NextResponse } from "next/server";
import { getParent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Data export for the account holder (PRD §13). RLS limits every query to
// this parent's own rows. Later phases add progress tables to this list.
export async function GET() {
  const parent = await getParent();
  if (!parent) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const supabase = await createClient();
  const [students, consent, subscriptions, invoices, refunds] = await Promise.all([
    supabase.from("students").select("id, display_name, class_grade, band, content_level, avatar, xp, level, rank, weekly_goal, league_opt_in, public_portfolio, status, created_at, deleted_at"),
    supabase.from("consent_log").select("student_id, action, version, method, created_at"),
    supabase.from("subscriptions").select("id, student_id, status, starts_at, ends_at, amount_paise, created_at"),
    supabase.from("invoices").select("number, amount_paise, tax_paise, issued_at"),
    supabase.from("refunds").select("subscription_id, status, reason, created_at"),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    parent,
    children: students.data ?? [],
    consent: consent.data ?? [],
    subscriptions: subscriptions.data ?? [],
    invoices: invoices.data ?? [],
    refunds: refunds.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="offbook-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
