import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, hqButton, PageHeader } from "@/components/hq/ui";
import { crmStaff, rupees, crmOwners } from "@/lib/crm/data";
import { pickParams, savedViews } from "@/lib/crm/views";
import { createClient } from "@/lib/supabase/server";
import { SavedViews } from "../SavedViews";

export const metadata: Metadata = { title: "Organizations" };

const KEYS = ["q", "kind", "city", "board", "owner"] as const;

export default async function OrganizationsPage({ searchParams }: PageProps<"/hq/crm/organizations">) {
  const { staff, canWrite } = await crmStaff();
  const f = pickParams(await searchParams, KEYS);
  const supabase = await createClient();
  let q = supabase.from("organizations").select("id, name, kind, city, board, owner_id, school_id, contacts(count), deals(status, value_paise)").order("name").limit(300);
  if (f.q) q = q.ilike("name", `%${f.q.replace(/[%,()]/g, " ").trim()}%`);
  if (f.kind) q = q.eq("kind", f.kind);
  if (f.city) q = q.ilike("city", f.city);
  if (f.board) q = q.eq("board", f.board);
  if (f.owner) q = f.owner === "none" ? q.is("owner_id", null) : q.eq("owner_id", f.owner);
  const [{ data }, owners, views] = await Promise.all([q, crmOwners(), savedViews("organization", staff.id)]);
  const ownerName = new Map(owners.map((o) => [o.id, o.name]));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Organizations"
        description="Schools and partners."
        actions={
          canWrite && (
            <Link href="/hq/crm/organizations/new" className={hqButton("primary")}>
              New organization
            </Link>
          )
        }
      />
      <SavedViews object="organization" basePath="/hq/crm/organizations" views={views} current={f} />
      <form className="mb-3 flex flex-wrap items-end gap-2 text-xs" action="/hq/crm/organizations">
        <input name="q" defaultValue={f.q} placeholder="Search by name" className="h-8 w-56 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Search" />
        <select name="kind" defaultValue={f.kind} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Type">
          <option value="">Any type</option>
          <option value="school">School</option>
          <option value="partner">Partner</option>
          <option value="other">Other</option>
        </select>
        <input name="city" defaultValue={f.city} placeholder="City" className="h-8 w-32 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="City" />
        <select name="board" defaultValue={f.board} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2" aria-label="Board">
          <option value="">Any board</option>
          {["CBSE", "ICSE", "State", "IB", "IGCSE", "Other"].map((b) => (
            <option key={b}>{b}</option>
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
        <button className={hqButton("secondary", "h-8")}>Filter</button>
      </form>
      <Card>
        {(data ?? []).length === 0 ? (
          <Empty>No organizations match.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                {["Name", "City", "Board", "Contacts", "Open deals", "Owner", "Partner"].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((o) => {
                const deals = (o.deals ?? []) as { status: string; value_paise: number }[];
                const open = deals.filter((d) => d.status === "open");
                return (
                  <tr key={o.id} className="border-t border-[#eeecf2]">
                    <td className="py-2 pr-3">
                      <Link href={`/hq/crm/organizations/${o.id}`} className="font-semibold text-violet-700 hover:underline">
                        {o.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{o.city ?? "—"}</td>
                    <td className="py-2 pr-3">{o.board ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{(o.contacts as unknown as { count: number }[])[0]?.count ?? 0}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {open.length} {open.length > 0 && <span className="text-xs text-[#6b6778]">({rupees(open.reduce((n, d) => n + d.value_paise, 0))})</span>}
                    </td>
                    <td className="py-2 pr-3 text-xs">{o.owner_id ? (ownerName.get(o.owner_id) ?? "—") : "Unassigned"}</td>
                    <td className="py-2 text-xs">{o.school_id ? "School code linked" : deals.some((d) => d.status === "won") ? "Paid" : "—"}</td>
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
