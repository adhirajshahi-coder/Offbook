"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hqButton, hqInput } from "@/components/hq/ui";
import { cn } from "@/lib/utils";
import { deleteView, saveView } from "./actions";

type View = { id: string; name: string; filters: Record<string, string>; mine: boolean; shared: boolean };

/** Saved views (PRD §12.1, Attio-style): a named set of list filters, private or shared with the team. */
export function SavedViews({ object, basePath, views, current }: { object: "contact" | "organization" | "deal" | "family"; basePath: string; views: View[]; current: Record<string, string> }) {
  const router = useRouter();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const href = (f: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    return q.size ? `${basePath}?${q}` : basePath;
  };
  const same = (f: Record<string, string>) => JSON.stringify(Object.entries(f).filter(([, v]) => v).sort()) === JSON.stringify(Object.entries(current).filter(([, v]) => v).sort());
  const hasFilters = Object.values(current).some(Boolean);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
      <Link href={basePath} className={cn("rounded-full px-2.5 py-1 font-semibold", !hasFilters ? "bg-violet-600 text-white" : "border border-[#d9d6e2] bg-white")}>
        All
      </Link>
      {views.map((v) => (
        <span key={v.id} className={cn("flex items-center rounded-full", same(v.filters) ? "bg-violet-600 text-white" : "border border-[#d9d6e2] bg-white")}>
          <Link href={href(v.filters)} className="px-2.5 py-1 font-semibold">
            {v.name}
            {v.shared && <span className="ml-1 font-normal opacity-75">· team</span>}
          </Link>
          {v.mine && (
            <button
              type="button"
              aria-label={`Delete view ${v.name}`}
              className="pr-2 opacity-70 hover:opacity-100"
              onClick={async () => {
                if (!window.confirm(`Delete the view "${v.name}"?`)) return;
                await deleteView(v.id);
                router.refresh();
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {hasFilters && !naming && (
        <button type="button" className={hqButton("ghost", "h-7 px-2 text-xs")} onClick={() => setNaming(true)}>
          Save this view
        </button>
      )}
      {naming && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await saveView({ object, name, filters: current, shared });
            if (r.ok) {
              setNaming(false);
              setName("");
              router.refresh();
            } else setError(r.error ?? "Couldn't save.");
          }}
        >
          <input className={cn(hqInput, "h-7 w-40 text-xs")} placeholder="View name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus aria-label="View name" />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            Share with team
          </label>
          <button type="submit" className={hqButton("primary", "h-7 px-2 text-xs")}>
            Save
          </button>
          <button type="button" className={hqButton("ghost", "h-7 px-2 text-xs")} onClick={() => setNaming(false)}>
            Cancel
          </button>
          {error && <span className="text-[#b4233f]">{error}</span>}
        </form>
      )}
    </div>
  );
}
