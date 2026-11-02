import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured() ? "configured" : "missing",
    time: new Date().toISOString(),
  });
}
