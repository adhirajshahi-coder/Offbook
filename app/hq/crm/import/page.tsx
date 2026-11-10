import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { CRM_WRITE } from "@/lib/crm/data";
import { Importer } from "./Importer";

export const metadata: Metadata = { title: "Import contacts" };

export default async function ImportPage() {
  await requireStaff(CRM_WRITE);
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Import contacts"
        crumbs={[{ href: "/hq/crm/contacts", label: "Contacts" }]}
        description="Upload a list (school lists, creator lists). Rows with a school or organization also get the organization and a Schools deal. Existing contacts are matched by email, then phone, and only blank fields are filled."
      />
      <Card>
        <Importer />
      </Card>
      <p className="mt-3 text-xs text-[#6b6778]">Only import people who expect to hear from Offbook. No cold outreach to parents who didn&apos;t ask (PRD §12.9).</p>
    </div>
  );
}
