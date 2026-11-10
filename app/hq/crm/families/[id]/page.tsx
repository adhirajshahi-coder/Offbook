import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Notice, PageHeader, StatusBadge } from "@/components/hq/ui";
import { BAND_LABEL } from "@/lib/bands";
import { crmStaff, rupees, crmOwners, timeline } from "@/lib/crm/data";
import { istDay } from "@/lib/gamification/streaks";
import { audit } from "@/lib/hq/audit";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { ActivityComposer } from "../../ActivityComposer";
import { Timeline } from "../../Timeline";
import { FamilyControls } from "./FamilyControls";

export const metadata: Metadata = { title: "Family" };

export default async function FamilyPage({ params }: PageProps<"/hq/crm/families/[id]">) {
  const { staff, canWrite } = await crmStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: fam } = await supabase.from("families").select("*").eq("parent_id", id).maybeSingle();
  if (!fam) notFound();

  // Child data shown below is counts and first names only; access is audited (PRD §12.10).
  const admin = createAdminClient();
  const [{ data: parent }, { data: kids }, { data: subs }, { data: deals }, owners] = await Promise.all([
    admin.from("parents").select("name, email, phone, created_at, signup_utm, referral_code_id").eq("id", id).single(),
    admin.from("students").select("id, display_name, class_grade, band, xp, level, rank, status, created_at").eq("parent_id", id).is("deleted_at", null),
    admin.from("subscriptions").select("id, student_id, status, starts_at, ends_at, amount_paise").eq("parent_id", id).order("created_at", { ascending: false }),
    supabase.from("deals").select("id, title, status, value_paise, pipeline_stages(name)").eq("family_parent_id", id).order("created_at", { ascending: false }),
    crmOwners(),
  ]);
  await audit("child_record.view", "family", id, { via: "crm" });

  const kidIds = (kids ?? []).map((k) => k.id);
  const [{ data: lastXp }, { data: lessons }] = kidIds.length
    ? await Promise.all([
        admin.from("xp_events").select("student_id, created_at").in("student_id", kidIds).order("created_at", { ascending: false }).limit(500),
        admin.from("lesson_progress").select("student_id, completed_at").in("student_id", kidIds).not("completed_at", "is", null),
      ])
    : [{ data: [] }, { data: [] }];
  const events = await timeline({ familyParentId: id, dealIds: (deals ?? []).map((d) => d.id) });

  const usage = (kids ?? []).map((k) => {
    const mine = (lastXp ?? []).filter((x) => x.student_id === k.id);
    const days = new Set(mine.map((x) => istDay(new Date(x.created_at))));
    return {
      ...k,
      lastActive: mine[0]?.created_at ?? null,
      lessonsDone: (lessons ?? []).filter((l) => l.student_id === k.id).length,
      activeDays30: [...days].filter((d) => d >= istDay(new Date(new Date().getTime() - 30 * 86_400_000))).length,
      plan: (subs ?? []).find((s) => s.student_id === k.id && s.status === "active"),
    };
  });

  return (
    <div className="max-w-6xl">
      <PageHeader title={parent?.name ?? parent?.email ?? "Family"} crumbs={[{ href: "/hq/crm/families", label: "Families" }]} description={[parent?.email, parent?.phone].filter(Boolean).join(" · ") || undefined} />
      {fam.at_risk && (
        <div className="mb-4">
          <Notice tone="warn">At risk: no learning activity for 7+ days{fam.at_risk_since ? ` (since ${new Date(fam.at_risk_since).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})` : ""}. A supportive note was queued; follow up kindly, not with a sales push.</Notice>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card title="Children and usage">
            {usage.length === 0 ? (
              <p className="text-sm text-[#6b6778]">No child profiles yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[#6b6778]">
                  <tr>
                    {["Child", "Band", "Lessons done", "Active days (30)", "Last active", "Plan"].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usage.map((k) => (
                    <tr key={k.id} className="border-t border-[#eeecf2]">
                      <td className="py-2 pr-3">
                        <Link href={`/hq/ops/students/${k.id}`} className="font-semibold text-violet-700 hover:underline">
                          {k.display_name}
                        </Link>
                        <span className="block text-xs text-[#6b6778]">
                          Class {k.class_grade} · L{k.level} · {k.xp} XP
                        </span>
                      </td>
                      <td className="py-2 pr-3">{BAND_LABEL[k.band as keyof typeof BAND_LABEL]}</td>
                      <td className="py-2 pr-3 tabular-nums">{k.lessonsDone}</td>
                      <td className="py-2 pr-3 tabular-nums">{k.activeDays30}</td>
                      <td className="py-2 pr-3 text-xs">{k.lastActive ? new Date(k.lastActive).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Never"}</td>
                      <td className="py-2 text-xs">{k.plan ? `Until ${new Date(k.plan.ends_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card title="Deals">
            {(deals ?? []).length === 0 ? (
              <p className="text-sm text-[#6b6778]">No deals yet. The daily sync creates one per family.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {deals!.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <Link href={`/hq/crm/deals/${d.id}`} className="text-violet-700 hover:underline">
                      {d.title}
                    </Link>
                    <span className="flex items-center gap-2 text-xs">
                      {(d.pipeline_stages as unknown as { name: string } | null)?.name} · {rupees(d.value_paise)}
                      <StatusBadge status={d.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Family">
            <FamilyControls parentId={id} ownerId={fam.owner_id ?? ""} atRisk={fam.at_risk} owners={owners} canEdit={canWrite || staff.role === "ops"} />
            <p className="mt-3 text-xs text-[#6b6778]">
              Signed up {parent ? new Date(parent.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              {parent?.signup_utm && Object.keys(parent.signup_utm).length > 0 && ` · ${Object.entries(parent.signup_utm as Record<string, string>).map(([k, v]) => `${k}=${v}`).join(", ")}`}
            </p>
          </Card>
        </div>
        <div className="space-y-4">
          {(canWrite || staff.role === "ops") && (
            <Card title="Log or schedule">
              <ActivityComposer links={{ family_parent_id: id }} owners={owners} defaultOwner={fam.owner_id ?? staff.id} />
            </Card>
          )}
          <Card title="Timeline">
            <Timeline events={events} canWrite={canWrite} />
          </Card>
        </div>
      </div>
    </div>
  );
}
