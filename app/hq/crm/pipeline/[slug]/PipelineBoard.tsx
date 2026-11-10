"use client";

import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { moveDeal } from "../../actions";

export type BoardDeal = {
  id: string;
  title: string;
  stageId: string;
  status: "open" | "won" | "lost";
  value: number;
  org: string | null;
  owner: string;
  nextActivity: string | null;
  expectedClose: string | null;
  stale: "no_next_activity" | "no_movement" | null;
  daysInStage: number;
};

type Stage = { id: string; name: string; probability: number; outcome: string };

const rupees = (p: number) => `₹${Math.round(p / 100).toLocaleString("en-IN")}`;
const STALE = { no_next_activity: "No next activity", no_movement: "No movement" };
const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function PipelineBoard({ stages, deals: initial, view, canWrite }: { stages: Stage[]; deals: BoardDeal[]; view: "board" | "table"; canWrite: boolean }) {
  const [deals, setDeals] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const stageName = new Map(stages.map((s) => [s.id, s.name]));

  async function onDragEnd(e: DragEndEvent) {
    const dealId = String(e.active.id);
    const to = e.over ? String(e.over.id) : null;
    const deal = deals.find((d) => d.id === dealId);
    if (!to || !deal || deal.stageId === to) return;
    const outcome = stages.find((s) => s.id === to)?.outcome as BoardDeal["status"];
    const before = deals;
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stageId: to, status: outcome, daysInStage: 0, stale: outcome === "open" && !d.nextActivity ? "no_next_activity" : null } : d)));
    setError(null);
    const r = await moveDeal(dealId, to);
    if (!r.ok) {
      setDeals(before);
      setError(r.error ?? "Couldn't move that deal.");
    }
  }

  if (view === "table") {
    return (
      <div className="overflow-x-auto rounded-lg border border-[#e4e2ea] bg-white">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#6b6778]">
            <tr>
              {["Deal", "Stage", "Value", "Owner", "Next activity", "Expected close", "Days in stage"].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className={cn("border-t border-[#eeecf2]", d.stale && "bg-[#fff8e6]")}>
                <td className="px-3 py-2">
                  <Link href={`/hq/crm/deals/${d.id}`} className="font-semibold text-violet-700 hover:underline">
                    {d.title}
                  </Link>
                  {d.stale && <span className="ml-2 text-xs text-[#8a5a00]">{STALE[d.stale]}</span>}
                </td>
                <td className="px-3 py-2">{stageName.get(d.stageId)}</td>
                <td className="px-3 py-2 tabular-nums">{rupees(d.value)}</td>
                <td className="px-3 py-2">{d.owner}</td>
                <td className="px-3 py-2">{d.nextActivity ? when(d.nextActivity) : "—"}</td>
                <td className="px-3 py-2">{d.expectedClose ? when(d.expectedClose) : "—"}</td>
                <td className="px-3 py-2 tabular-nums">{d.daysInStage}</td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[#6b6778]">
                  No deals match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-2 text-sm text-[#b4233f]">
          {error}
        </p>
      )}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((s) => {
            const list = deals.filter((d) => d.stageId === s.id);
            return (
              <Column key={s.id} stage={s} count={list.length} total={list.reduce((n, d) => n + d.value, 0)}>
                {list.map((d) => (
                  <Card key={d.id} deal={d} draggable={canWrite} />
                ))}
              </Column>
            );
          })}
        </div>
      </DndContext>
      {canWrite && <p className="mt-1 text-xs text-[#6b6778]">Drag a card to change its stage. Amber cards are stale: no next activity, or no movement for a while.</p>}
    </>
  );
}

function Column({ stage, count, total, children }: { stage: Stage; count: number; total: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section ref={setNodeRef} aria-label={stage.name} className={cn("flex w-64 shrink-0 flex-col rounded-lg border bg-[#f7f6fa] p-2", isOver ? "border-violet-600" : "border-[#e4e2ea]")}>
      <header className="mb-2 px-1">
        <h2 className="flex items-center justify-between text-xs font-bold">
          {stage.name}
          <span className="font-normal text-[#6b6778]">{stage.probability}%</span>
        </h2>
        <p className="text-xs text-[#6b6778]">
          {count} · {rupees(total)}
        </p>
      </header>
      <div className="flex min-h-16 flex-col gap-2">{children}</div>
    </section>
  );
}

function Card({ deal, draggable }: { deal: BoardDeal; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id, disabled: !draggable });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-md border bg-white p-2 text-xs shadow-sm",
        deal.stale ? "border-[#f0c25a] bg-[#fff8e6]" : "border-[#e4e2ea]",
        draggable && "cursor-grab",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <Link href={`/hq/crm/deals/${deal.id}`} className="block text-sm font-semibold text-ink hover:underline" onPointerDown={(e) => e.stopPropagation()}>
        {deal.title}
      </Link>
      {deal.org && <p className="text-[#6b6778]">{deal.org}</p>}
      <p className="mt-1 flex justify-between">
        <span className="font-semibold tabular-nums">{rupees(deal.value)}</span>
        <span className="text-[#6b6778]">{deal.owner}</span>
      </p>
      <p className={cn("mt-1", deal.stale ? "font-semibold text-[#8a5a00]" : "text-[#6b6778]")}>
        {deal.stale ? STALE[deal.stale] : deal.nextActivity ? `Next: ${when(deal.nextActivity)}` : deal.status === "open" ? "" : deal.status === "won" ? "Won" : "Lost"}
      </p>
    </article>
  );
}
