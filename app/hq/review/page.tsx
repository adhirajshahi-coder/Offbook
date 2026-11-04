import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, Notice, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { SLA_ALERT_HOURS, SLA_HOURS } from "@/lib/hq/review";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Review queue" };

const TABS = [
  { key: "queue", label: "Queue" },
  { key: "mine", label: "Assigned to me" },
  { key: "samples", label: "Make samples" },
  { key: "done", label: "Recently reviewed" },
] as const;
type Tab = (typeof TABS)[number]["key"];

type Row = {
  id: string;
  kind: "make" | "capstone" | "challenge";
  status: string;
  created_at: string;
  reviewed_at: string | null;
  assigned_to: string | null;
  students: { display_name: string; class_grade: number } | null;
  courses: { title: string } | null;
  challenges: { title: string } | null;
};

const KIND_LABEL = { make: "Make (sample)", capstone: "Capstone", challenge: "Challenge" };

/** About 1 in 8 Make steps is sampled for a quality check (PRD §11.3); the id decides, so the sample is stable. */
function sampled(id: string) {
  return id[0] === "0" || id[0] === "1";
}

function ageHours(iso: string, now: number) {
  return (now - new Date(iso).getTime()) / 3_600_000;
}

export default async function ReviewQueuePage({ searchParams }: PageProps<"/hq/review">) {
  const staff = await requireStaff(["reviewer", "ops"]);
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === rawTab) ? (rawTab as Tab) : "queue";
  const supabase = await createClient();

  const select = "id, kind, status, created_at, reviewed_at, assigned_to, students(display_name, class_grade), courses(title), challenges(title)";
  let q = supabase.from("submissions").select(select);
  if (tab === "queue") q = q.eq("status", "pending").in("kind", ["capstone", "challenge"]).order("created_at").limit(200);
  else if (tab === "mine") q = q.eq("assigned_to", staff.id).in("status", ["pending", "kept"]).order("created_at").limit(200);
  else if (tab === "samples") q = q.eq("status", "kept").eq("kind", "make").order("created_at", { ascending: false }).limit(240);
  else q = q.in("status", ["approved", "revision", "rejected"]).order("reviewed_at", { ascending: false }).limit(50);

  const [{ data }, { data: team }, { count: pendingCount }] = await Promise.all([
    q,
    createAdminClient().from("staff").select("id, name"), // staff can only read their own row; names only, after the role check
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  let rows = (data ?? []) as unknown as Row[];
  if (tab === "samples") rows = rows.filter((r) => sampled(r.id)).slice(0, 30);
  const who = new Map((team ?? []).map((s) => [s.id, s.name]));
  const now = new Date().getTime();
  const overdue = tab === "queue" ? rows.filter((r) => ageHours(r.created_at, now) >= SLA_ALERT_HOURS).length : 0;

  return (
    <div>
      <PageHeader
        title="Review queue"
        description={`Capstones and challenges, oldest first. Target: reviewed within ${SLA_HOURS} hours. ${pendingCount ?? 0} waiting.`}
      />
      {overdue > 0 && (
        <div className="mb-4">
          <Notice tone="error">
            {overdue} {overdue === 1 ? "submission has" : "submissions have"} waited over {SLA_ALERT_HOURS} hours.
          </Notice>
        </div>
      )}
      <nav aria-label="Queue views" className="mb-3 flex gap-1 border-b border-[#e4e2ea]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "queue" ? "/hq/review" : `/hq/review?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-semibold", tab === t.key ? "border-violet-600" : "border-transparent text-[#6b6778] hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/hq/review/showcase" className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-[#6b6778] hover:text-ink">
          Showcase
        </Link>
      </nav>
      <Card>
        {rows.length === 0 ? (
          <Empty>{tab === "queue" ? "Queue is clear. New capstones and challenges show up here." : "Nothing here."}</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                <th className="py-2 pr-3 font-semibold">{tab === "done" ? "Reviewed" : "Waiting"}</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Student</th>
                <th className="py-2 pr-3 font-semibold">Work</th>
                <th className="py-2 font-semibold">{tab === "done" ? "Decision" : "Assigned"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const h = ageHours(tab === "done" && r.reviewed_at ? r.reviewed_at : r.created_at, now);
                const late = tab !== "done" && r.kind !== "make" && h >= SLA_ALERT_HOURS;
                return (
                  <tr key={r.id} className="border-t border-[#eeecf2]">
                    <td className={cn("py-2 pr-3 tabular-nums", late && "font-semibold text-[#b4233f]")}>
                      {h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`}
                      {tab === "done" ? " ago" : ""}
                      {late && " ⚠"}
                    </td>
                    <td className="py-2 pr-3">{KIND_LABEL[r.kind]}</td>
                    <td className="py-2 pr-3">
                      {r.students?.display_name ?? "—"} <span className="text-[#6b6778]">· Class {r.students?.class_grade}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <Link href={`/hq/review/${r.id}`} className="font-medium text-violet-700 hover:underline">
                        {r.challenges?.title ?? r.courses?.title ?? "Submission"}
                      </Link>
                    </td>
                    <td className="py-2">
                      {tab === "done" ? <StatusBadge status={r.status} /> : r.assigned_to ? (r.assigned_to === staff.id ? "You" : (who.get(r.assigned_to) ?? "Someone")) : <span className="text-[#6b6778]">Unassigned</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
