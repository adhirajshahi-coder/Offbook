import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { BAND_LABEL, type Band } from "@/lib/bands";
import { RANK_LABEL, type Rank } from "@/lib/gamification/xp";
import { audit } from "@/lib/hq/audit";
import type { Student } from "@/lib/play/session";
import { loadWorld } from "@/lib/play/state";
import { createClient } from "@/lib/supabase/server";
import { CourseOverride, PinReset, Placement, StatusToggle } from "./StudentActions";

export const metadata: Metadata = { title: "Student" };

export default async function StudentPage({ params }: PageProps<"/hq/ops/students/[id]">) {
  await requireStaff(["ops"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("students")
    .select("id, display_name, class_grade, band, content_level, started_level, avatar, xp, level, rank, weekly_goal, status, created_at, parents(name, email, phone, consent_version, consent_at), schools(name)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  // Access to a child's record is audited (PRD §12.10).
  await audit("child_record.view", "student", id);

  const [world, { data: subs }, { data: overrides }, { data: events }, { data: subsWork }] = await Promise.all([
    loadWorld(s as unknown as Student),
    supabase.from("subscriptions").select("id, status, starts_at, ends_at, amount_paise").eq("student_id", id).neq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("course_overrides").select("action, reason, created_at, courses(title, short_title)").eq("student_id", id).order("created_at", { ascending: false }),
    supabase.from("xp_events").select("source_type, amount, created_at").eq("student_id", id).order("created_at", { ascending: false }).limit(12),
    supabase.from("submissions").select("kind, status, created_at, courses(title, short_title)").eq("student_id", id).order("created_at", { ascending: false }).limit(10),
  ]);

  const parent = s.parents as unknown as { name: string | null; email: string | null; phone: string | null; consent_version: string | null; consent_at: string | null } | null;
  const levelCourses = world.courses
    .filter((c) => c.level === s.content_level || world.unlock.states[c.id] !== "locked")
    .sort((a, b) => Number(b.kind === "bridge") - Number(a.kind === "bridge") || a.level - b.level || (a.order_index ?? 50) - (b.order_index ?? 50));
  const slotTitle = new Map(world.slots.map((x) => [x.id, x.title]));

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader
        title={s.display_name}
        crumbs={[
          { href: "/hq/ops", label: "Operations" },
          { href: "/hq/ops/students", label: "Students" },
        ]}
        description={`Class ${s.class_grade} · ${BAND_LABEL[s.band as Band]} look · Level ${s.content_level} courses · started at Level ${s.started_level}`}
        actions={<StatusBadge status={s.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Progress">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-[#6b6778]">XP</dt>
            <dd>{s.xp}</dd>
            <dt className="text-[#6b6778]">Level</dt>
            <dd>{s.level}</dd>
            <dt className="text-[#6b6778]">Rank</dt>
            <dd>{RANK_LABEL[s.rank as Rank] ?? s.rank}</dd>
            <dt className="text-[#6b6778]">Weekly goal</dt>
            <dd>{s.weekly_goal} days</dd>
            <dt className="text-[#6b6778]">Joined</dt>
            <dd>{s.created_at.slice(0, 10)}</dd>
          </dl>
        </Card>
        <Card title="Parent">
          <p className="text-sm font-semibold">{parent?.name ?? "No name"}</p>
          <p className="text-sm">{parent?.email}</p>
          {parent?.phone && <p className="text-sm">{parent.phone}</p>}
          <p className="mt-2 text-xs text-[#6b6778]">
            Consent {parent?.consent_at ? `given ${parent.consent_at.slice(0, 10)} (${parent.consent_version})` : "not recorded"}
          </p>
          {(s.schools as unknown as { name: string } | null)?.name && <p className="mt-1 text-xs text-[#6b6778]">School: {(s.schools as unknown as { name: string }).name}</p>}
        </Card>
        <Card title="Plans">
          <ul className="space-y-1 text-sm">
            {(subs ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>
                  {p.starts_at?.slice(0, 10)} to {p.ends_at?.slice(0, 10)}
                </span>
                <StatusBadge status={p.status} />
              </li>
            ))}
            {(subs ?? []).length === 0 && <li className="text-[#6b6778]">No plans.</li>}
          </ul>
          <a href="/hq/ops/subscriptions" className="mt-2 inline-block text-xs font-semibold text-violet-700 hover:underline">
            Manage plans and refunds
          </a>
        </Card>
      </div>

      <Card title="Courses">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#6b6778]">
            <tr>
              <th className="pb-2 font-semibold">Course</th>
              <th className="pb-2 font-semibold">Level</th>
              <th className="pb-2 font-semibold">On the path</th>
              <th className="pb-2 font-semibold">State</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {levelCourses.map((c) => (
              <tr key={c.id} className="border-t border-[#eeecf2] align-top">
                <td className="py-2 font-semibold">{c.short_title ?? c.title}</td>
                <td className="py-2">{c.kind === "bridge" ? "Bridge" : c.level}</td>
                <td className="py-2 text-[#6b6778]">{c.slot_id ? `Choice: ${slotTitle.get(c.slot_id)}` : c.order_index ? `Step ${c.order_index}` : ""}</td>
                <td className="py-2">
                  <StatusBadge status={world.unlock.states[c.id]} />
                </td>
                <td className="py-2 text-right">
                  <CourseOverride studentId={id} courseId={c.id} title={c.short_title ?? c.title} state={world.unlock.states[c.id]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Actions">
          <div className="space-y-4">
            <PinReset studentId={id} />
            <Placement studentId={id} classGrade={s.class_grade} contentLevel={s.content_level} />
            <StatusToggle studentId={id} status={s.status} />
          </div>
        </Card>
        <Card title="Recent activity">
          <ul className="space-y-1 text-sm">
            {(events ?? []).map((e, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>{e.source_type.replace(/_/g, " ")}</span>
                <span className="text-[#6b6778]">
                  +{e.amount} XP · {e.created_at.slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
            {(events ?? []).length === 0 && <li className="text-[#6b6778]">No activity yet.</li>}
          </ul>
          {(subsWork ?? []).length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold text-[#6b6778]">Submissions</p>
              <ul className="space-y-1 text-sm">
                {(subsWork ?? []).map((w, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {w.kind} · {(w.courses as unknown as { short_title: string | null; title: string } | null)?.short_title ?? (w.courses as unknown as { title: string } | null)?.title}
                    </span>
                    <StatusBadge status={w.status} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card title="Overrides">
        {(overrides ?? []).length === 0 ? (
          <p className="text-sm text-[#6b6778]">No overrides.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(overrides ?? []).map((o, i) => (
              <li key={i}>
                <strong>{o.action}</strong> {(o.courses as unknown as { short_title: string | null; title: string }).short_title ?? (o.courses as unknown as { title: string }).title} · {o.reason} ·{" "}
                <span className="text-[#6b6778]">{o.created_at.slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
