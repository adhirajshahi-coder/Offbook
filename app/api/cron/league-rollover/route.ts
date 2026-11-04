import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { rollover } from "@/lib/play/league";

/**
 * Weekly league rollover (PRD §7.8). Call every Monday just after 00:00 IST
 * (Sunday 18:30 UTC) with `Authorization: Bearer $CRON_SECRET`, e.g. from a
 * Vercel cron or Supabase scheduled function. Idempotent.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await rollover();
  return NextResponse.json(report);
}

export const GET = handle;
export const POST = handle;
