"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMessage, Field, Select, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";
import type { CustomField } from "@/lib/crm/data";
import { saveContact } from "../../actions";
import { CustomFieldInputs } from "../../CustomFieldInputs";

export type ContactValues = {
  name: string;
  email: string;
  phone: string;
  title: string;
  kind: "principal" | "coordinator" | "teacher" | "parent_lead" | "creator" | "partner" | "other";
  organization_id: string;
  owner_id: string;
  source: string;
  custom: Record<string, string | number | string[] | null>;
};

const KINDS = [
  ["principal", "Principal"],
  ["coordinator", "Coordinator"],
  ["teacher", "Teacher"],
  ["parent_lead", "Parent lead"],
  ["creator", "Creator"],
  ["partner", "Partner"],
  ["other", "Other"],
] as const;

export function ContactForm({
  id,
  initial,
  orgs,
  owners,
  fields,
  canWrite,
}: {
  id: string | null;
  initial: ContactValues;
  orgs: { id: string; name: string }[];
  owners: { id: string; name: string }[];
  fields: CustomField[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const { pending, msg, run } = useAction();
  const set = (k: keyof ContactValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const r = await saveContact(id, v);
          if (r.ok && !id && r.id) router.replace(`/hq/crm/contacts/${r.id}`);
          return r;
        });
      }}
    >
      <fieldset disabled={!canWrite} className="contents">
        <Field label="Name">
          <TextInput value={v.name} onChange={set("name")} required maxLength={120} />
        </Field>
        <Field label="Type">
          <Select value={v.kind} onChange={set("kind")}>
            {KINDS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email">
          <TextInput type="email" value={v.email} onChange={set("email")} maxLength={120} />
        </Field>
        <Field label="Phone">
          <TextInput value={v.phone} onChange={set("phone")} maxLength={20} />
        </Field>
        <Field label="Title">
          <TextInput value={v.title} onChange={set("title")} maxLength={80} />
        </Field>
        <Field label="Organization">
          <Select value={v.organization_id} onChange={set("organization_id")}>
            <option value="">None</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Owner">
          <Select value={v.owner_id} onChange={set("owner_id")}>
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source">
          <TextInput value={v.source} onChange={set("source")} maxLength={80} />
        </Field>
        <CustomFieldInputs fields={fields} values={v.custom} onChange={(custom) => setV({ ...v, custom })} />
        {canWrite && (
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={pending} className={hqButton("primary")}>
              {id ? "Save contact" : "Create contact"}
            </button>
            <ActionMessage msg={msg} />
          </div>
        )}
      </fieldset>
    </form>
  );
}
