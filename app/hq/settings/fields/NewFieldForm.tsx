"use client";

import { useState } from "react";
import { ActionMessage, useAction } from "@/components/hq/forms";
import { hqButton, hqInput } from "@/components/hq/ui";
import { cn } from "@/lib/utils";
import { addCustomField } from "../crm-actions";

type Obj = "contact" | "organization" | "deal" | "family";
type FieldType = "text" | "number" | "date" | "select" | "multi_select" | "url";

export function NewFieldForm() {
  const [object, setObject] = useState<Obj>("organization");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [options, setOptions] = useState("");
  const { pending, msg, run } = useAction();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const r = await addCustomField({ object, label, type, options: options.split(",").map((o) => o.trim()).filter(Boolean) });
          if (r.ok) {
            setLabel("");
            setOptions("");
          }
          return r;
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]">
        On
        <select className={cn(hqInput, "w-40")} value={object} onChange={(e) => setObject(e.target.value as Obj)}>
          <option value="contact">Contacts</option>
          <option value="organization">Organizations</option>
          <option value="deal">Deals</option>
          <option value="family">Families</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]">
        Label
        <input className={cn(hqInput, "w-48")} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} required placeholder="Student strength" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]">
        Type
        <select className={cn(hqInput, "w-36")} value={type} onChange={(e) => setType(e.target.value as FieldType)}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="select">Select</option>
          <option value="multi_select">Multi-select</option>
          <option value="url">URL</option>
        </select>
      </label>
      {(type === "select" || type === "multi_select") && (
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]">
          Options (comma-separated)
          <input className={cn(hqInput, "w-64")} value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Day school, Boarding" />
        </label>
      )}
      <button type="submit" disabled={pending} className={hqButton("primary")}>
        Add field
      </button>
      <ActionMessage msg={msg} />
    </form>
  );
}
