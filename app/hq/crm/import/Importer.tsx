"use client";

import Papa from "papaparse";
import { useState } from "react";
import { ActionMessage } from "@/components/hq/forms";
import { hqButton, hqInput } from "@/components/hq/ui";
import { guessMapping, mapRow, type ImportField } from "@/lib/crm/rules";
import { cn } from "@/lib/utils";
import { importContacts, previewImport } from "../actions";

const FIELDS: [ImportField, string][] = [
  ["skip", "Skip"],
  ["name", "Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["title", "Title"],
  ["organization", "Organization / school"],
  ["city", "City"],
  ["board", "Board"],
  ["kind", "Contact type"],
];

type Mapped = ReturnType<typeof mapRow>;

/** CSV import with a column mapper and a dedupe preview (PRD §12.3). */
export function Importer() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, ImportField>>({});
  const [preview, setPreview] = useState<{ row: Mapped; match: string | null }[] | null>(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onFile(file: File) {
    setMsg(null);
    setPreview(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = (res.meta.fields ?? []).filter(Boolean);
        if (!hs.length || !res.data.length) {
          setMsg({ ok: false, text: "That file has no rows. Use a CSV with a header row." });
          return;
        }
        if (res.data.length > 2000) setMsg({ ok: false, text: `The file has ${res.data.length} rows; only the first 2,000 will be imported.` });
        setHeaders(hs);
        setRows(res.data.slice(0, 2000));
        setMapping(guessMapping(hs));
        setSource(file.name.replace(/\.csv$/i, "").slice(0, 60));
      },
      error: () => setMsg({ ok: false, text: "Couldn't read that file." }),
    });
  }

  const mapped = rows.map((r) => mapRow(r, mapping));
  const hasName = Object.values(mapping).includes("name");
  const hasKey = Object.values(mapping).includes("email") || Object.values(mapping).includes("phone");

  async function check() {
    setBusy(true);
    const { matches } = await previewImport(mapped.map((m) => ({ email: m.email, phone: m.phone })));
    setPreview(mapped.map((row, i) => ({ row, match: matches[i] })));
    setBusy(false);
  }

  async function run() {
    setBusy(true);
    const r = await importContacts(mapped, source);
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Imported.") : (r.error ?? "Import failed.") });
    if (r.ok) {
      setRows([]);
      setPreview(null);
    }
  }

  const valid = (m: Mapped) => Boolean(m.name && (m.email || m.phone));

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold text-[#4f4b5c]">CSV file (header row, up to 2,000 rows)</span>
        <input type="file" accept=".csv,text/csv" className="mt-1 block text-sm" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>

      {headers.length > 0 && (
        <>
          <section>
            <h2 className="text-sm font-bold">1. Match columns</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h) => (
                <label key={h} className="flex items-center justify-between gap-2 rounded-md border border-[#e4e2ea] bg-white px-2 py-1.5 text-sm">
                  <span className="truncate" title={h}>
                    {h}
                    <span className="block truncate text-xs text-[#6b6778]">{rows[0]?.[h]}</span>
                  </span>
                  <select className={cn(hqInput, "h-8 w-40")} value={mapping[h]} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as ImportField })}>
                    {FIELDS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {(!hasName || !hasKey) && <p className="mt-2 text-xs text-[#b4233f]">Map a Name column and at least one of Email or Phone.</p>}
            <label className="mt-3 flex items-center gap-2 text-sm">
              Source label
              <input className={cn(hqInput, "w-56")} value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} />
            </label>
            <button type="button" disabled={!hasName || !hasKey || busy} onClick={check} className={hqButton("secondary", "mt-3")}>
              {busy && !preview ? "Checking…" : "2. Preview and check duplicates"}
            </button>
          </section>

          {preview && (
            <section>
              <h2 className="text-sm font-bold">
                3. Review: {preview.filter((p) => valid(p.row) && !p.match).length} new, {preview.filter((p) => valid(p.row) && p.match).length} match existing contacts (gaps filled, nothing overwritten),{" "}
                {preview.filter((p) => !valid(p.row)).length} will be skipped
              </h2>
              <div className="mt-2 max-h-96 overflow-auto rounded-md border border-[#e4e2ea] bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#f7f6fa] text-left text-[#6b6778]">
                    <tr>
                      {["", "Name", "Email", "Phone", "Organization", "City"].map((h) => (
                        <th key={h} className="px-2 py-1.5 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 300).map((p, i) => (
                      <tr key={i} className={cn("border-t border-[#eeecf2]", !valid(p.row) && "text-[#8a8697] line-through")}>
                        <td className="px-2 py-1">{!valid(p.row) ? "Skip" : p.match ? <span className="text-[#8a5a00]">Matches {p.match}</span> : <span className="text-[#1f6b2a]">New</span>}</td>
                        <td className="px-2 py-1">{p.row.name}</td>
                        <td className="px-2 py-1">{p.row.email}</td>
                        <td className="px-2 py-1">{p.row.phone}</td>
                        <td className="px-2 py-1">{p.row.organization}</td>
                        <td className="px-2 py-1">{p.row.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 300 && <p className="mt-1 text-xs text-[#6b6778]">Showing the first 300 rows.</p>}
              <button type="button" disabled={busy} onClick={run} className={hqButton("primary", "mt-3")}>
                {busy ? "Importing…" : `Import ${preview.filter((p) => valid(p.row)).length} rows`}
              </button>
            </section>
          )}
        </>
      )}
      <ActionMessage msg={msg} />
    </div>
  );
}
