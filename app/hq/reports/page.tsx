import type { Metadata } from "next";
import Link from "next/link";
import { Card, hqButton, PageHeader } from "@/components/hq/ui";
import { requireStaff, type StaffRole } from "@/lib/auth";
import { defaultFilters, REPORTS, runReport, type ReportKey } from "@/lib/reports";
import { createAdminClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { BarChartCard } from "./BarChartCard";

export const metadata: Metadata = { title: "Reports" };

const REPORT_ROLES: StaffRole[] = ["sales", "marketing", "ops", "viewer"];

export default async function ReportsPage({ searchParams }: PageProps<"/hq/reports">) {
  await requireStaff(REPORT_ROLES);
  const sp = await searchParams;
  const tab = (REPORTS.find((r) => r.key === sp.tab)?.key ?? "executive") as ReportKey;
  const f = defaultFilters(sp);
  const admin = createAdminClient();
  const [report, { data: schools }, { data: staff }] = await Promise.all([
    runReport(tab, f),
    admin.from("schools").select("id, name").order("name"),
    admin.from("staff").select("id, name").in("role", ["sales", "admin"]).eq("active", true).order("name"),
  ]);
  const qs = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ tab, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), ...patch });
    return q.toString();
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Reports"
        description="Counts and totals only. Change the filters, then export what you see as CSV."
        actions={
          <a href={`/hq/reports/export?${qs({})}`} className={hqButton("secondary")}>
            Export CSV
          </a>
        }
      />
      <nav aria-label="Report areas" className="mb-3 flex gap-1 overflow-x-auto border-b border-[#e4e2ea]">
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={`/hq/reports?${qs({ tab: r.key })}`}
            aria-current={tab === r.key ? "page" : undefined}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold", tab === r.key ? "border-violet-600" : "border-transparent text-[#6b6778] hover:text-ink")}
          >
            {r.label}
          </Link>
        ))}
      </nav>
      <form action="/hq/reports" className="mb-4 flex flex-wrap items-end gap-2 text-xs">
        <input type="hidden" name="tab" value={tab} />
        <label className="flex flex-col gap-1 font-semibold text-[#4f4b5c]">
          From
          <input type="date" name="from" defaultValue={f.from} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2 font-normal" />
        </label>
        <label className="flex flex-col gap-1 font-semibold text-[#4f4b5c]">
          To
          <input type="date" name="to" defaultValue={f.to} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2 font-normal" />
        </label>
        <label className="flex flex-col gap-1 font-semibold text-[#4f4b5c]">
          Band
          <select name="band" defaultValue={f.band} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2 font-normal">
            <option value="">All bands</option>
            <option value="explore">Explore (6–8)</option>
            <option value="build">Build (9–10)</option>
            <option value="launch">Launch (11–12)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 font-semibold text-[#4f4b5c]">
          School
          <select name="school" defaultValue={f.school} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2 font-normal">
            <option value="">All schools</option>
            {(schools ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {tab === "sales" && (
          <label className="flex flex-col gap-1 font-semibold text-[#4f4b5c]">
            Owner
            <select name="owner" defaultValue={f.owner} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2 font-normal">
              <option value="">Everyone</option>
              {(staff ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className={hqButton("secondary", "h-8")}>Apply</button>
      </form>

      <dl className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {report.tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-[#e4e2ea] bg-white p-3">
            <dt className="text-xs font-semibold text-[#6b6778]">{t.label}</dt>
            <dd className="mt-1 font-display text-2xl font-black tabular-nums">{t.value}</dd>
            {t.hint && <dd className="text-xs text-[#6b6778]">{t.hint}</dd>}
          </div>
        ))}
      </dl>

      {report.charts.length > 0 && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          {report.charts.map((c) => (
            <BarChartCard key={c.title} {...c} />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {report.tables.map((t) => (
          <Card key={t.title} title={t.title}>
            {t.rows.length === 0 ? (
              <p className="text-sm text-[#6b6778]">Nothing for these filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-[#6b6778]">
                  <tr>
                    {t.columns.map((c) => (
                      <th key={c} className="pb-2 pr-3 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((row, i) => (
                    <tr key={i} className="border-t border-[#eeecf2]">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1.5 pr-3 tabular-nums">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))}
      </div>
      {report.notes?.map((n) => (
        <p key={n} className="mt-3 text-xs text-[#6b6778]">
          {n}
        </p>
      ))}
    </div>
  );
}
