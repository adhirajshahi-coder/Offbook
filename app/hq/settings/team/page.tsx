import type { Metadata } from "next";
import { PageHeader } from "@/components/hq/ui";
import { requireStaff, type StaffRole } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { TeamEditor } from "./TeamEditor";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireStaff([]); // admins only (admins pass every role check)
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff").select("id, name, role, active").order("name");

  // Emails live on the auth accounts; admin-only page, read with the service role.
  const emails = new Map<string, string>();
  const admin = createAdminClient();
  for (let page = 1; page < 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users ?? []) if (u.email) emails.set(u.id, u.email);
    if (!data || data.users.length < 200) break;
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Team" crumbs={[{ href: "/hq/settings/team", label: "Settings" }]} description="Who can use Offbook HQ, and what each person can open." />
      <TeamEditor
        members={(staff ?? []).map((s) => ({ id: s.id, name: s.name, email: emails.get(s.id) ?? "", role: s.role as StaffRole, active: s.active, isMe: s.id === me.id }))}
      />
    </div>
  );
}
