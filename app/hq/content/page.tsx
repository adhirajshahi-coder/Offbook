import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Content" };

export default async function ContentHome() {
  const staff = await requireStaff(["content", "teacher"]);
  if (staff.role === "teacher") redirect("/hq/content/videos");

  const supabase = await createClient();
  const [{ data: tracks }, { data: courses }, { data: slots }] = await Promise.all([
    supabase.from("tracks").select("id, zone_name, name, order_index").order("order_index"),
    supabase.from("courses").select("id, title, short_title, level, kind, order_index, slot_id, status, track_id, missions(id, status, lessons(id, status))"),
    supabase.from("course_slots").select("id, title"),
  ]);
  const slotTitle = new Map((slots ?? []).map((s) => [s.id, s.title]));

  return (
    <div className="max-w-5xl">
      <PageHeader title="Courses" description="Every course, by zone. Open one to edit its missions and lessons." />
      <div className="flex flex-col gap-4">
        {(tracks ?? []).map((t) => {
          const list = (courses ?? [])
            .filter((c) => c.track_id === t.id)
            .sort((a, b) => a.level - b.level || (a.order_index ?? 50) - (b.order_index ?? 50));
          return (
            <Card key={t.id} title={`${t.zone_name} · ${t.name}`}>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[#6b6778]">
                  <tr>
                    <th className="pb-2 font-semibold">Course</th>
                    <th className="pb-2 font-semibold">Level</th>
                    <th className="pb-2 font-semibold">On the path</th>
                    <th className="pb-2 font-semibold">Lessons live</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => {
                    const lessons = (c.missions ?? []).flatMap((m: { lessons: { status: string }[] }) => m.lessons ?? []);
                    const live = lessons.filter((l: { status: string }) => l.status === "published").length;
                    return (
                      <tr key={c.id} className="border-t border-[#eeecf2]">
                        <td className="py-2">
                          <Link href={`/hq/content/courses/${c.id}`} className="font-semibold text-violet-700 hover:underline">
                            {c.short_title ?? c.title}
                          </Link>
                          {c.short_title && <span className="ml-2 text-xs text-[#6b6778]">{c.title}</span>}
                        </td>
                        <td className="py-2">{c.kind === "bridge" ? "Bridge" : c.level}</td>
                        <td className="py-2 text-[#6b6778]">
                          {c.slot_id ? `Choice: ${slotTitle.get(c.slot_id)}` : c.order_index ? `Step ${c.order_index}` : "First, for late joiners"}
                        </td>
                        <td className="py-2">
                          {live} of {lessons.length}
                        </td>
                        <td className="py-2">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
