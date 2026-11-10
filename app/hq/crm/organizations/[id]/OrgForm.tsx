"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMessage, Field, Select, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";
import type { CustomField } from "@/lib/crm/data";
import { saveOrganization } from "../../actions";
import { CustomFieldInputs } from "../../CustomFieldInputs";

export type OrgValues = {
  name: string;
  kind: "school" | "partner" | "other";
  city: string;
  state: string;
  board: string;
  website: string;
  owner_id: string;
  school_id: string;
  custom: Record<string, string | number | string[] | null>;
};

export function OrgForm({
  id,
  initial,
  owners,
  schools,
  fields,
  canWrite,
}: {
  id: string | null;
  initial: OrgValues;
  owners: { id: string; name: string }[];
  schools: { id: string; name: string; school_code: string }[];
  fields: CustomField[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const { pending, msg, run } = useAction();
  const set = (k: keyof OrgValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const r = await saveOrganization(id, v as Parameters<typeof saveOrganization>[1]);
          if (r.ok && !id && r.id) router.replace(`/hq/crm/organizations/${r.id}`);
          return r;
        });
      }}
    >
      <fieldset disabled={!canWrite} className="contents">
        <Field label="Name" className="md:col-span-2">
          <TextInput value={v.name} onChange={set("name")} required maxLength={160} />
        </Field>
        <Field label="Type">
          <Select value={v.kind} onChange={set("kind")}>
            <option value="school">School</option>
            <option value="partner">Partner</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Board">
          <Select value={v.board} onChange={set("board")}>
            <option value="">—</option>
            {["CBSE", "ICSE", "State", "IB", "IGCSE", "Other"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
        <Field label="City">
          <TextInput value={v.city} onChange={set("city")} maxLength={60} />
        </Field>
        <Field label="State">
          <TextInput value={v.state} onChange={set("state")} maxLength={60} />
        </Field>
        <Field label="Website">
          <TextInput type="url" value={v.website} onChange={set("website")} maxLength={200} placeholder="https://" />
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
        <Field label="School code (partner school)" hint="Links students who joined with this code, for cohort stats." className="md:col-span-2">
          <Select value={v.school_id} onChange={set("school_id")}>
            <option value="">Not a partner yet</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.school_code}
              </option>
            ))}
          </Select>
        </Field>
        <CustomFieldInputs fields={fields} values={v.custom} onChange={(custom) => setV({ ...v, custom })} />
        {canWrite && (
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={pending} className={hqButton("primary")}>
              {id ? "Save organization" : "Create organization"}
            </button>
            <ActionMessage msg={msg} />
          </div>
        )}
      </fieldset>
    </form>
  );
}
