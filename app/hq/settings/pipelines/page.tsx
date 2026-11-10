import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PipelineEditor } from "./PipelineEditor";

export const metadata: Metadata = { title: "Pipelines" };

export default async function PipelinesSettingsPage() {
  await requireStaff([]);
  const supabase = await createClient();
  const [{ data: pipelines }, { data: deals }] = await Promise.all([
    supabase.from("pipelines").select("id, name, stale_days, pipeline_stages(id, name, order_index, probability, outcome)").order("order_index"),
    supabase.from("deals").select("stage_id"),
  ]);
  const count = (stageId: string) => (deals ?? []).filter((d) => d.stage_id === stageId).length;

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Pipelines" description="Stages, stage probabilities (for the forecast) and when an open deal turns stale." />
      {(pipelines ?? []).map((p) => (
        <Card key={p.id} title={p.name}>
          <PipelineEditor
            id={p.id}
            name={p.name}
            staleDays={p.stale_days}
            stages={(p.pipeline_stages as { id: string; name: string; order_index: number; probability: number; outcome: "open" | "won" | "lost" }[])
              .sort((a, b) => a.order_index - b.order_index)
              .map((s) => ({ id: s.id, name: s.name, probability: s.probability, outcome: s.outcome, deals: count(s.id) }))}
          />
        </Card>
      ))}
    </div>
  );
}
