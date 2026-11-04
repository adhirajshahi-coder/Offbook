"use client";

import { useState, useTransition } from "react";
import { ActionMessage } from "@/components/hq/forms";
import { Card, hqButton } from "@/components/hq/ui";
import { saveGameConfig } from "@/app/hq/content/play-actions";

export function GameConfigEditor({ slug, initial, status: initialStatus }: { slug: string; initial: string; status: "draft" | "published" }) {
  const [json, setJson] = useState(initial);
  const [status, setStatus] = useState(initialStatus);
  const [issues, setIssues] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  let parseError: string | null = null;
  try {
    JSON.parse(json);
  } catch (e) {
    parseError = (e as Error).message;
  }

  return (
    <Card
      title="Config (JSON)"
      actions={
        <label className="flex items-center gap-2 text-xs font-semibold">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} className="h-7 rounded-md border border-[#d9d6e2] bg-white px-1 text-xs">
            <option value="draft">Draft (hidden from students)</option>
            <option value="published">Published</option>
          </select>
        </label>
      }
    >
      <label htmlFor="config" className="sr-only">
        Game config JSON
      </label>
      <textarea
        id="config"
        spellCheck={false}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={28}
        className="w-full rounded-md border border-[#d9d6e2] bg-[#fbfbfd] p-2 font-mono text-xs leading-relaxed text-ink"
      />
      {parseError && <p className="mt-1 text-xs text-[#b4233f]">JSON: {parseError}</p>}
      {issues.length > 0 && (
        <ul role="alert" className="mt-2 list-disc space-y-0.5 rounded-md border border-[#f2c2cc] bg-[#fdf1f3] py-2 pl-6 pr-2 text-xs text-[#b4233f]">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || Boolean(parseError)}
          className={hqButton("primary")}
          onClick={() =>
            start(async () => {
              setMsg(null);
              const r = await saveGameConfig(slug, json, status);
              setIssues(r.issues ?? []);
              setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved.") : (r.error ?? "That didn't save.") });
            })
          }
        >
          {pending ? "Checking…" : "Validate and save"}
        </button>
        <button type="button" className={hqButton("ghost")} onClick={() => setJson(JSON.stringify(JSON.parse(json), null, 2))} disabled={Boolean(parseError)}>
          Format
        </button>
        <ActionMessage msg={msg} />
      </div>
    </Card>
  );
}
