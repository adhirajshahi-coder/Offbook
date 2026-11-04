import type { Metadata } from "next";
import { PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuditTable } from "./AuditTable";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireStaff([]); // admins only
  const supabase = await createClient();
  const [{ data: rows }, { data: staff }] = await Promise.all([
    supabase.from("audit_log").select("id, actor_id, action, target_type, target_id, details, created_at").order("created_at", { ascending: false }).limit(2000),
    supabase.from("staff").select("id, name"),
  ]);
  const who = new Map((staff ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Audit log"
        crumbs={[{ href: "/hq/settings/team", label: "Settings" }]}
        description="Overrides, refunds, role changes, placement changes and every view of a child's record. Newest first."
      />
      <AuditTable
        rows={(rows ?? []).map((r) => ({
          when: r.created_at.slice(0, 19).replace("T", " "),
          who: r.actor_id ? (who.get(r.actor_id) ?? "Unknown") : "System",
          action: r.action,
          target: `${r.target_type}${r.target_id ? ` ${r.target_id.slice(0, 8)}` : ""}`,
          targetType: r.target_type,
          targetId: r.target_id ?? "",
          details: Object.keys(r.details ?? {}).length ? JSON.stringify(r.details) : "",
        }))}
      />
    </div>
  );
}
