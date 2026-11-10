"use client";

import { hqInput } from "@/components/hq/ui";
import type { CustomField } from "@/lib/crm/data";

type Value = string | number | string[] | null;

/** Inputs for the custom fields added in Settings → Fields (PRD §12.1). */
export function CustomFieldInputs({ fields, values, onChange }: { fields: CustomField[]; values: Record<string, Value>; onChange: (v: Record<string, Value>) => void }) {
  if (fields.length === 0) return null;
  const set = (key: string, v: Value) => onChange({ ...values, [key]: v });
  return (
    <>
      {fields.map((f) => {
        const id = `cf-${f.key}`;
        const v = values[f.key];
        return (
          <label key={f.key} htmlFor={id} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#4f4b5c]">{f.label}</span>
            {f.type === "select" ? (
              <select id={id} className={hqInput} value={(v as string) ?? ""} onChange={(e) => set(f.key, e.target.value || null)}>
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "multi_select" ? (
              <span id={id} className="flex flex-wrap gap-2 text-sm">
                {f.options.map((o) => {
                  const list = Array.isArray(v) ? v : [];
                  return (
                    <span key={o} className="flex items-center gap-1">
                      <input type="checkbox" checked={list.includes(o)} onChange={(e) => set(f.key, e.target.checked ? [...list, o] : list.filter((x) => x !== o))} aria-label={o} />
                      {o}
                    </span>
                  );
                })}
              </span>
            ) : (
              <input
                id={id}
                className={hqInput}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
                value={v === null || v === undefined ? "" : String(v)}
                onChange={(e) => set(f.key, e.target.value === "" ? null : f.type === "number" ? Number(e.target.value) : e.target.value)}
              />
            )}
          </label>
        );
      })}
    </>
  );
}

