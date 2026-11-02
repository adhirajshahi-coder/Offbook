import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ChildSummary = {
  id: string;
  display_name: string;
  class_grade: number;
  band: "explore" | "build" | "launch";
  content_level: number;
  status: "active" | "paused" | "archived";
  activeUntil: string | null;
  subscriptionId: string | null;
};

/** The signed-in parent's children with their current plan status (RLS-scoped). */
export async function getChildren(): Promise<ChildSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, display_name, class_grade, band, content_level, status, subscriptions(id, status, starts_at, ends_at)")
    .is("deleted_at", null)
    .order("created_at");

  const now = Date.now();
  return (data ?? []).map((s) => {
    const active = (s.subscriptions ?? [])
      .filter(
        (x: { status: string; starts_at: string | null; ends_at: string | null }) =>
          x.status === "active" && x.ends_at && new Date(x.ends_at).getTime() > now,
      )
      .sort((a: { ends_at: string }, b: { ends_at: string }) => b.ends_at.localeCompare(a.ends_at))[0];
    return {
      id: s.id,
      display_name: s.display_name,
      class_grade: s.class_grade,
      band: s.band,
      content_level: s.content_level,
      status: s.status,
      activeUntil: active?.ends_at ?? null,
      subscriptionId: active?.id ?? null,
    } as ChildSummary;
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
