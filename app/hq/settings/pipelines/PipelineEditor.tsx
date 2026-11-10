"use client";

import { useState } from "react";
import { ActionMessage, useAction } from "@/components/hq/forms";
import { hqButton, hqInput } from "@/components/hq/ui";
import { cn } from "@/lib/utils";
import { savePipeline } from "../crm-actions";

type Stage = { id: string | null; name: string; probability: number; outcome: "open" | "won" | "lost"; deals: number };

export function PipelineEditor({ id, name: initialName, staleDays, stages: initial }: { id: string; name: string; staleDays: number; stages: Stage[] }) {
  const [name, setName] = useState(initialName);
  const [stale, setStale] = useState(String(staleDays));
  const [stages, setStages] = useState(initial);
  const { pending, msg, run } = useAction();
  const update = (i: number, patch: Partial<Stage>) => setStages((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) =>
    setStages((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => savePipeline(id, { name, stale_days: stale, stages: stages.map(({ id: sid, name: n, probability, outcome }) => ({ id: sid, name: n, probability, outcome })) }));
      }}
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]">
          Name
          <input className={cn(hqInput, "w-56")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]">
          Stale after (days without stage change)
          <input className={cn(hqInput, "w-28")} type="number" min={1} max={365} value={stale} onChange={(e) => setStale(e.target.value)} />
        </label>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-[#6b6778]">
          <tr>
            <th className="pb-1 font-semibold">Order</th>
            <th className="pb-1 font-semibold">Stage</th>
            <th className="pb-1 font-semibold">Probability %</th>
            <th className="pb-1 font-semibold">Outcome</th>
            <th className="pb-1 font-semibold">Deals</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => (
            <tr key={s.id ?? `new-${i}`} className="border-t border-[#eeecf2]">
              <td className="py-1 pr-2">
                <button type="button" aria-label="Move up" className={hqButton("ghost", "h-7 px-1.5")} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" aria-label="Move down" className={hqButton("ghost", "h-7 px-1.5")} onClick={() => move(i, 1)}>
                  ↓
                </button>
              </td>
              <td className="py-1 pr-2">
                <input className={hqInput} value={s.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={60} aria-label="Stage name" />
              </td>
              <td className="py-1 pr-2">
                <input className={cn(hqInput, "w-20")} type="number" min={0} max={100} value={s.probability} onChange={(e) => update(i, { probability: Number(e.target.value) })} aria-label="Probability" />
              </td>
              <td className="py-1 pr-2">
                <select className={cn(hqInput, "w-24")} value={s.outcome} onChange={(e) => update(i, { outcome: e.target.value as Stage["outcome"] })} aria-label="Outcome">
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </td>
              <td className="py-1 pr-2 tabular-nums">{s.deals}</td>
              <td className="py-1">
                <button type="button" disabled={s.deals > 0} title={s.deals ? "Move its deals first" : undefined} className={hqButton("ghost", "h-7 px-2 text-xs")} onClick={() => setStages((x) => x.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3">
        <button type="button" className={hqButton("secondary")} onClick={() => setStages((s) => [...s, { id: null, name: "", probability: 10, outcome: "open", deals: 0 }])}>
          Add stage
        </button>
        <button type="submit" disabled={pending} className={hqButton("primary")}>
          Save pipeline
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
