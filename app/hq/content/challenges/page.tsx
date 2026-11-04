import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, hqButton, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { TYPE_LABEL } from "@/lib/play/challenges";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesAdminPage() {
  await requireStaff(["content"]);
  const supabase = await createClient();
  const [{ data: challenges }, { data: subs }] = await Promise.all([
    supabase.from("challenges").select("id, title, type, xp, status, starts_at, ends_at, courses(short_title, title)").order("created_at", { ascending: false }),
    // Content editors can't read submissions; counts only, after the role check.
    createAdminClient().from("submissions").select("challenge_id, status").eq("kind", "challenge"),
  ]);
  const count = (id: string, status?: string) => (subs ?? []).filter((s) => s.challenge_id === id && (!status || s.status === status)).length;
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "");

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Challenges"
        description="Real-world challenges with a brief, a rubric and a safety note. Parents okay each one before a child starts."
        actions={
          <Link href="/hq/content/challenges/new" className={hqButton("primary")}>
            New challenge
          </Link>
        }
      />
      <Card>
        {(challenges ?? []).length === 0 ? (
          <Empty>No challenges yet.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                <th className="pb-2 font-semibold">Challenge</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Opens with</th>
                <th className="pb-2 font-semibold">Window</th>
                <th className="pb-2 font-semibold">Submissions</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(challenges ?? []).map((c) => {
                const course = c.courses as unknown as { short_title: string | null; title: string } | null;
                return (
                  <tr key={c.id} className="border-t border-[#eeecf2]">
                    <td className="py-2">
                      <Link href={`/hq/content/challenges/${c.id}`} className="font-semibold text-violet-700 hover:underline">
                        {c.title}
                      </Link>
                      <span className="text-[#6b6778]"> · {c.xp} XP</span>
                    </td>
                    <td className="py-2">{TYPE_LABEL[c.type as keyof typeof TYPE_LABEL]}</td>
                    <td className="py-2">{course ? (course.short_title ?? course.title) : "Any time"}</td>
                    <td className="py-2 text-[#6b6778]">{c.starts_at || c.ends_at ? `${fmt(c.starts_at) || "now"} – ${fmt(c.ends_at) || "open"}` : "Always"}</td>
                    <td className="py-2 tabular-nums">
                      {count(c.id)} <span className="text-[#6b6778]">({count(c.id, "pending")} waiting)</span>
                    </td>
                    <td className="py-2">
                      <StatusBadge status={c.status} />
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
