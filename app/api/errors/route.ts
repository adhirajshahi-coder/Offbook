import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logError } from "@/lib/monitoring";

/**
 * Browser error reports from error boundaries (PRD §17). Small, unauthenticated
 * by design (errors can happen before sign-in), size-capped and rate-limited
 * per server instance.
 */
const bodySchema = z.object({ message: z.string().max(2000), digest: z.string().max(100).optional(), path: z.string().max(500).optional() });

let windowStart = 0;
let count = 0;
const LIMIT_PER_MINUTE = 60;

export async function POST(request: NextRequest) {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    count = 0;
  }
  if (++count > LIMIT_PER_MINUTE) return new NextResponse(null, { status: 429 });
  const raw = await request.text();
  if (raw.length > 4000) return new NextResponse(null, { status: 413 });
  const parsed = bodySchema.safeParse((() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })());
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  await logError({ source: "client", message: parsed.data.message, digest: parsed.data.digest, path: parsed.data.path, kind: "browser" });
  return new NextResponse(null, { status: 204 });
}
