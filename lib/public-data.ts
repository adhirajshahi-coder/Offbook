import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Read-only data the public site shows. Everything comes from the DB. */

export type Zone = {
  id: string;
  slug: string;
  name: string;
  zone_name: string;
  color: string;
  courses: { slug: string; title: string; short_title: string | null; level: number; promise: string; priority: string; capstone: { brief?: string } }[];
};

export const getZones = cache(async (): Promise<Zone[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracks")
    .select("id, slug, name, zone_name, color, order_index, courses(slug, title, short_title, level, promise, priority, kind, order_index, capstone)")
    .eq("status", "published")
    .order("order_index");
  return (data ?? []).map((t) => ({
    ...t,
    courses: (t.courses ?? [])
      .filter((c: { kind: string }) => c.kind === "standard")
      .sort((a: { level: number; order_index: number | null }, b: { level: number; order_index: number | null }) =>
        a.level - b.level || (a.order_index ?? 99) - (b.order_index ?? 99),
      ),
  })) as Zone[];
});

export type PublicPlan = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_paise: number;
  tax_rate: number;
  tax_inclusive: boolean;
  duration_days: number;
  features: string[];
};

export const getPlan = cache(async (slug = "annual"): Promise<PublicPlan | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("id, slug, name, description, price_paise, tax_rate, tax_inclusive, duration_days, features")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return data as PublicPlan | null;
});

export type Policy = { slug: string; title: string; body: string; version: string; meta: Record<string, unknown>; updated_at: string };

export const getPolicy = cache(async (slug: string): Promise<Policy | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("policies").select("*").eq("slug", slug).maybeSingle();
  return data as Policy | null;
});

export async function refundWindowDays(): Promise<number> {
  const policy = await getPolicy("refunds");
  const days = Number(policy?.meta?.window_days);
  return Number.isFinite(days) && days > 0 ? days : 7;
}
