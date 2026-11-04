import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Operations" };

function window30() {
  return { now: new Date().toISOString(), soon: new Date(Date.now() + 30 * 86_400_000).toISOString() };
}

export default async function OpsHome() {
  await requireStaff(["ops", "reviewer"]);
  const supabase = await createClient();
  const { now, soon } = window30();
  const [students, active, refunds, capstones, renewing] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", now),
    supabase.from("refunds").select("id", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("kind", "capstone").eq("status", "pending"),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").gt("ends_at", now).lt("ends_at", soon),
  ]);

  const tiles = [
    { label: "Students", value: students.count ?? 0, href: "/hq/ops/students" },
    { label: "Active plans", value: active.count ?? 0, href: "/hq/ops/subscriptions" },
    { label: "Refunds to decide", value: refunds.count ?? 0, href: "/hq/ops/subscriptions" },
    { label: "Plans ending in 30 days", value: renewing.count ?? 0, href: "/hq/ops/subscriptions" },
    { label: "Capstones waiting for review", value: capstones.count ?? 0, href: "/hq/ops", note: "Review queue arrives in Phase 4" },
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader title="Operations" description="Students, plans, refunds and reviews." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="h-full hover:border-violet-600">
              <p className="text-xs font-semibold text-[#6b6778]">{t.label}</p>
              <p className="font-display text-3xl font-black">{t.value}</p>
              {t.note && <p className="text-xs text-[#6b6778]">{t.note}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
