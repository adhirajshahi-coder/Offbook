import type { Metadata } from "next";
import { PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StudentsTable, type StudentRow } from "./StudentsTable";

export const metadata: Metadata = { title: "Students" };

const nowMs = () => Date.now();

export default async function StudentsPage() {
  await requireStaff(["ops"]);
  const supabase = await createClient();
  const now = nowMs();
  const [{ data: students }, { data: recent }] = await Promise.all([
    supabase
      .from("students")
      .select("id, display_name, class_grade, band, content_level, level, rank, status, created_at, parents(email, phone), schools(name), subscriptions(status, ends_at)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("xp_events").select("student_id, created_at").gte("created_at", new Date(now - 60 * 86_400_000).toISOString()).order("created_at", { ascending: false }).limit(20000),
  ]);
  const lastActive = new Map<string, string>();
  for (const e of recent ?? []) if (!lastActive.has(e.student_id)) lastActive.set(e.student_id, e.created_at);

  const rows: StudentRow[] = (students ?? []).map((s) => {
    const subs = (s.subscriptions ?? []) as { status: string; ends_at: string | null }[];
    const live = subs.find((x) => x.status === "active" && x.ends_at && new Date(x.ends_at).getTime() > now);
    const parent = s.parents as unknown as { email: string | null; phone: string | null } | null;
    return {
      id: s.id,
      name: s.display_name,
      class: s.class_grade,
      band: s.band,
      level: s.content_level,
      xpLevel: s.level,
      parent: parent?.email ?? parent?.phone ?? "",
      school: (s.schools as unknown as { name: string } | null)?.name ?? "",
      plan: live ? `Active to ${live.ends_at!.slice(0, 10)}` : subs.some((x) => x.status === "refunded") ? "Refunded" : "None",
      lastActive: lastActive.get(s.id)?.slice(0, 10) ?? "",
      status: s.status,
    };
  });

  return (
    <div className="max-w-6xl">
      <PageHeader title="Students" crumbs={[{ href: "/hq/ops", label: "Operations" }]} description="Open a student to see progress, reset a PIN, or grant a course." />
      <StudentsTable rows={rows} />
    </div>
  );
}
