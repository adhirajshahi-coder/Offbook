import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function savedViews(object: "contact" | "organization" | "deal" | "family", staffId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_views").select("id, name, filters, owner_id, shared").eq("object", object).order("created_at");
  return (data ?? []).map((v) => ({ id: v.id, name: v.name, filters: (v.filters ?? {}) as Record<string, string>, mine: v.owner_id === staffId, shared: v.shared }));
}

/** First value of each listed search param, as plain strings. */
export function pickParams<K extends string>(sp: Record<string, string | string[] | undefined>, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((k) => [k, (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? ""])) as Record<K, string>;
}
