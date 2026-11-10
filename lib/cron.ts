import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Cron routes accept only `Authorization: Bearer $CRON_SECRET`. Returns an error response, or null when authorised. */
export function cronGuard(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
