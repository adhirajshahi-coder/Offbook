import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, hqButton, PageHeader } from "@/components/hq/ui";
import { crmStaff, crmOwners } from "@/lib/crm/data";
import { KIND_LABEL } from "@/lib/crm/rules";
import { pickParams, savedViews } from "@/lib/crm/views";
import { createClient } from "@/lib/supabase/server";
import { SavedViews } from "../SavedViews";

export const metadata: Metadata = { title: "Contacts" };

const KEYS = ["q", "kind", "owner", "source"] as const;

export default async function ContactsPage({ searchParams }: PageProps<"/hq/crm/contacts">) {
  const { staff, canWrite } = await crmStaff();
  const f = pickParams(await searchParams, KEYS);
  const supabase = await createClient();
  let q = supabase.from("contacts").select("id, name, email, phone, title, kind, source, owner_id, created_at, organizations(id, name)").order("created_at", { ascending: false }).limit(300);
  if (f.q) {
    const term = f.q.replace(/[,()%]/g, " ").trim();
    q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  if (f.kind) q = q.eq("kind", f.kind);
  if (f.owner) q = f.owner === "none" ? q.is("owner_id", null) : q.eq("owner_id", f.owner);
  if (f.source) q = q.eq("source", f.source);
  const [{ data }, owners, views, { data: sourceRows }] = await Promise.all([q, crmOwners(), savedViews("contact", staff.id), supabase.from("contacts").select("source").not("source", "is", null).limit(1000)]);
  const ownerName = new Map(owners.map((o) => [o.id, o.name]));
  const sources = [...new Set((sourceRows ?? []).map((r) => r.source as string))].sort();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Contacts"
        description="Principals, coordinators, parent leads and creators. Deduplicated by email, then phone."
        actions={
          canWrite && (
            <>
              <Link href="/hq/crm/import" className={hqButton("secondary")}>
                Import CSV
              </Link>
              <Link href="/hq/crm/contacts/new" className={hqButton("primary")}>
                New contact
              </Link>
            </>
          )
        }
      />
      <SavedViews object="contact" basePath="/hq/crm/contacts" views={views} current={f} />
      <form className="mb-3 flex flex-wrap items-end gap-2 text-xs" action="/hq/crm/contacts">
        <input name="q" defaultValue={f.q} placeholder="Search name, email or phone" className="h-8 w-60 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Search" />
        <select name="kind" defaultValue={f.kind} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Type">
          <option value="">Any type</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select name="owner" defaultValue={f.owner} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Owner">
          <option value="">Any owner</option>
          <option value="none">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={f.source} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Source">
          <option value="">Any source</option>
          {sources.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className={hqButton("secondary", "h-8")}>Filter</button>
      </form>
      <Card>
        {(data ?? []).length === 0 ? (
          <Empty>No contacts match.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                {["Name", "Organization", "Type", "Email / phone", "Source", "Owner", "Added"].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c) => {
                const org = c.organizations as unknown as { id: string; name: string } | null;
                return (
                  <tr key={c.id} className="border-t border-[#eeecf2]">
                    <td className="py-2 pr-3">
                      <Link href={`/hq/crm/contacts/${c.id}`} className="font-semibold text-violet-700 hover:underline">
                        {c.name}
                      </Link>
                      {c.title && <span className="block text-xs text-[#6b6778]">{c.title}</span>}
                    </td>
                    <td className="py-2 pr-3">{org ? <Link href={`/hq/crm/organizations/${org.id}`} className="hover:underline">{org.name}</Link> : "—"}</td>
                    <td className="py-2 pr-3">{KIND_LABEL[c.kind]}</td>
                    <td className="py-2 pr-3 text-xs">
                      {c.email ?? ""}
                      {c.email && c.phone && <br />}
                      {c.phone ?? ""}
                    </td>
                    <td className="py-2 pr-3 text-xs">{c.source ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">{c.owner_id ? (ownerName.get(c.owner_id) ?? "—") : "Unassigned"}</td>
                    <td className="py-2 text-xs text-[#6b6778]">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
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
