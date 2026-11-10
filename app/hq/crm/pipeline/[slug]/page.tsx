import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hqButton, PageHeader } from "@/components/hq/ui";
import { crmStaff, rupees, crmOwners } from "@/lib/crm/data";
import { forecastByMonth, staleReason } from "@/lib/crm/rules";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PipelineBoard, type BoardDeal } from "./PipelineBoard";

export const metadata: Metadata = { title: "Pipeline" };

type Raw = {
  id: string;
  title: string;
  stage_id: string;
  status: "open" | "won" | "lost";
  value_paise: number;
  expected_close: string | null;
  stage_changed_at: string;
  closed_at: string | null;
  source: string | null;
  owner_id: string | null;
  organizations: { name: string; city: string | null; board: string | null } | null;
  contacts: { name: string } | null;
  activities: { due_at: string | null; done_at: string | null }[];
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PipelinePage({ params, searchParams }: PageProps<"/hq/crm/pipeline/[slug]">) {
  const { canWrite } = await crmStaff();
  const { slug } = await params;
  const sp = await searchParams;
  const view = one(sp.view) === "table" ? "table" : "board";
  const f = { owner: one(sp.owner), source: one(sp.source), city: one(sp.city), board: one(sp.board) };

  const supabase = await createClient();
  const { data: pipeline } = await supabase.from("pipelines").select("id, slug, name, kind, stale_days, pipeline_stages(id, name, order_index, probability, outcome)").eq("slug", slug).maybeSingle();
  if (!pipeline) notFound();
  const stages = (pipeline.pipeline_stages as { id: string; name: string; order_index: number; probability: number; outcome: string }[]).sort((a, b) => a.order_index - b.order_index);

  // Open deals plus anything closed in the last 30 days.
  const recent = new Date(new Date().getTime() - 30 * 86_400_000).toISOString();
  const [{ data }, owners] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, stage_id, status, value_paise, expected_close, stage_changed_at, closed_at, source, owner_id, organizations(name, city, board), contacts(name), activities(due_at, done_at)")
      .eq("pipeline_id", pipeline.id)
      .or(`status.eq.open,closed_at.gte.${recent}`)
      .order("stage_changed_at", { ascending: false })
      .limit(1000),
    crmOwners(),
  ]);
  const ownerName = new Map(owners.map((o) => [o.id, o.name]));
  const now = new Date();
  let rows = (data ?? []) as unknown as Raw[];
  const sources = [...new Set(rows.map((r) => r.source).filter(Boolean))] as string[];
  const cities = [...new Set(rows.map((r) => r.organizations?.city).filter(Boolean))] as string[];
  if (f.owner) rows = rows.filter((r) => (f.owner === "none" ? !r.owner_id : r.owner_id === f.owner));
  if (f.source) rows = rows.filter((r) => r.source === f.source);
  if (f.city) rows = rows.filter((r) => r.organizations?.city === f.city);
  if (f.board) rows = rows.filter((r) => r.organizations?.board === f.board);

  const deals: BoardDeal[] = rows.map((r) => {
    const next = r.activities.filter((a) => !a.done_at && a.due_at).map((a) => a.due_at!).sort()[0] ?? null;
    return {
      id: r.id,
      title: r.title,
      stageId: r.stage_id,
      status: r.status,
      value: r.value_paise,
      org: r.organizations?.name ?? r.contacts?.name ?? null,
      owner: r.owner_id ? (ownerName.get(r.owner_id) ?? "—") : "Unassigned",
      nextActivity: next,
      expectedClose: r.expected_close,
      stale: staleReason(r, Boolean(next), pipeline.stale_days, now),
      daysInStage: Math.floor((now.getTime() - new Date(r.stage_changed_at).getTime()) / 86_400_000),
    };
  });
  const probability = new Map(stages.map((s) => [s.id, s.probability]));
  const forecast = forecastByMonth(rows.map((r) => ({ value_paise: r.value_paise, probability: probability.get(r.stage_id) ?? 0, expected_close: r.expected_close, status: r.status })));
  const open = deals.filter((d) => d.status === "open");
  const staleCount = open.filter((d) => d.stale).length;
  const query = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ ...(view === "table" ? { view } : {}), ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), ...patch });
    for (const [k, v] of [...q.entries()]) if (!v) q.delete(k);
    const s = q.toString();
    return `/hq/crm/pipeline/${slug}${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title={`${pipeline.name} pipeline`}
        description={`${open.length} open · ${rupees(open.reduce((n, d) => n + d.value, 0))} open value · ${rupees(forecast.reduce((n, m) => n + m.weighted, 0))} weighted${staleCount ? ` · ${staleCount} stale` : ""}`}
        actions={
          <>
            <Link href={query({ view: view === "table" ? "" : "table" })} className={hqButton("secondary")}>
              {view === "table" ? "Board view" : "Table view"}
            </Link>
            {canWrite && (
              <Link href={`/hq/crm/deals/new?pipeline=${slug}`} className={hqButton("primary")}>
                New deal
              </Link>
            )}
          </>
        }
      />
      <form className="mb-3 flex flex-wrap items-end gap-2 text-xs" action={`/hq/crm/pipeline/${slug}`}>
        {view === "table" && <input type="hidden" name="view" value="table" />}
        <FilterSelect name="owner" label="Owner" value={f.owner} options={[["", "Anyone"], ["none", "Unassigned"], ...owners.map((o) => [o.id, o.name] as [string, string])]} />
        <FilterSelect name="source" label="Source" value={f.source} options={[["", "Any"], ...sources.map((s) => [s, s] as [string, string])]} />
        {pipeline.kind === "school" && (
          <>
            <FilterSelect name="city" label="City" value={f.city} options={[["", "Any"], ...cities.map((c) => [c, c] as [string, string])]} />
            <FilterSelect name="board" label="Board" value={f.board} options={[["", "Any"], ...["CBSE", "ICSE", "State", "IB", "IGCSE", "Other"].map((b) => [b, b] as [string, string])]} />
          </>
        )}
        <button type="submit" className={hqButton("secondary", "h-8")}>
          Filter
        </button>
        {Object.values(f).some(Boolean) && (
          <Link href={`/hq/crm/pipeline/${slug}${view === "table" ? "?view=table" : ""}`} className="pb-2 text-[#6b6778] underline">
            Clear
          </Link>
        )}
      </form>

      <PipelineBoard stages={stages} deals={deals} view={view} canWrite={canWrite} />

      <section className="mt-6 rounded-lg border border-[#e4e2ea] bg-white p-4">
        <h2 className="text-sm font-bold">Forecast</h2>
        <p className="text-xs text-[#6b6778]">Open deals by expected close, weighted by stage probability (edit probabilities in Settings → Pipelines).</p>
        {forecast.length === 0 ? (
          <p className="mt-2 text-sm text-[#6b6778]">No open deals.</p>
        ) : (
          <table className="mt-2 w-full max-w-lg text-sm">
            <thead className="text-left text-xs text-[#6b6778]">
              <tr>
                <th className="py-1 font-semibold">Month</th>
                <th className="py-1 font-semibold">Deals</th>
                <th className="py-1 text-right font-semibold">Total</th>
                <th className="py-1 text-right font-semibold">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((m) => (
                <tr key={m.month} className="border-t border-[#eeecf2]">
                  <td className="py-1">{m.month === "unscheduled" ? "No close date" : new Date(`${m.month}-01`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                  <td className="py-1 tabular-nums">{m.count}</td>
                  <td className="py-1 text-right tabular-nums">{rupees(m.total)}</td>
                  <td className={cn("py-1 text-right font-semibold tabular-nums")}>{rupees(m.weighted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 font-semibold text-[#4f4b5c]">
      {label}
      <select name={name} defaultValue={value} className="h-8 rounded-md border border-[#d9d6e2] bg-white px-2 font-normal">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
