"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionMessage, Field, Select, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";
import type { CustomField } from "@/lib/crm/data";
import { saveDeal } from "../../actions";
import { CustomFieldInputs } from "../../CustomFieldInputs";

export type DealValues = {
  pipeline_id: string;
  stage_id: string;
  title: string;
  organization_id: string;
  contact_id: string;
  owner_id: string;
  value_rupees: string;
  expected_close: string;
  source: string;
  campaign_id: string;
  lost_reason: string;
  custom: Record<string, string | number | string[] | null>;
};

type Opt = { id: string; name: string };

export function DealForm({
  id,
  initial,
  stages,
  orgs,
  contacts,
  owners,
  campaigns,
  fields,
  canWrite,
}: {
  id: string | null;
  initial: DealValues;
  stages: { id: string; name: string; outcome: string }[];
  orgs: Opt[];
  contacts: Opt[];
  owners: Opt[];
  campaigns: Opt[];
  fields: CustomField[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const { pending, msg, run } = useAction();
  const set = (k: keyof DealValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const lost = stages.find((s) => s.id === v.stage_id)?.outcome === "lost";

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const r = await saveDeal(id, { ...v, value_paise: Math.round(Number(v.value_rupees || 0) * 100) });
          if (r.ok && !id && r.id) router.replace(`/hq/crm/deals/${r.id}`);
          return r;
        });
      }}
    >
      <fieldset disabled={!canWrite} className="contents">
        <Field label="Title" className="md:col-span-2">
          <TextInput value={v.title} onChange={set("title")} required maxLength={160} />
        </Field>
        <Field label="Stage">
          <Select value={v.stage_id} onChange={set("stage_id")}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
        <Field label="Value (₹)">
          <TextInput type="number" min={0} step={1} value={v.value_rupees} onChange={set("value_rupees")} />
        </Field>
        <Field label="Expected close">
          <TextInput type="date" value={v.expected_close} onChange={set("expected_close")} />
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
        <Field label="Main contact">
          <Select value={v.contact_id} onChange={set("contact_id")}>
            <option value="">None</option>
            {contacts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source">
          <TextInput value={v.source} onChange={set("source")} maxLength={80} />
        </Field>
        <Field label="Campaign">
          <Select value={v.campaign_id} onChange={set("campaign_id")}>
            <option value="">None</option>
            {campaigns.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        {lost && (
          <Field label="Why was it lost?" className="md:col-span-2">
            <TextInput value={v.lost_reason} onChange={set("lost_reason")} maxLength={300} />
          </Field>
        )}
        <CustomFieldInputs fields={fields} values={v.custom} onChange={(custom) => setV({ ...v, custom })} />
        {canWrite && (
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={pending} className={hqButton("primary")}>
              {id ? "Save deal" : "Create deal"}
            </button>
            <ActionMessage msg={msg} />
          </div>
        )}
      </fieldset>
    </form>
  );
}
