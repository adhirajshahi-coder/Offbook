"use client";

import { useState } from "react";
import { updateMission } from "@/app/hq/content/actions";
import { ActionMessage, Field, Select, TextArea, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";

type Mission = { id: string; title: string; output_description: string; status: string; boss_title: string; boss_intro: string; boss_pass_pct: number };

export function MissionForm({ mission }: { mission: Mission }) {
  const [v, setV] = useState(mission);
  const { pending, msg, run } = useAction();
  const set = (k: keyof Mission) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateMission(mission.id, { ...v, status: v.status as "draft" | "published" | "archived" }));
      }}
    >
      <Field label="Title">
        <TextInput value={v.title} onChange={set("title")} required maxLength={120} />
      </Field>
      <Field label="Status" hint="Publish once at least one lesson is live.">
        <Select value={v.status} onChange={set("status")}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <Field label="What students make (the mission's real output)" className="md:col-span-2">
        <TextInput value={v.output_description} onChange={set("output_description")} maxLength={300} />
      </Field>
      <Field label="Boss challenge title">
        <TextInput value={v.boss_title} onChange={set("boss_title")} maxLength={120} />
      </Field>
      <Field label="Pass mark (%)">
        <TextInput type="number" min={50} max={100} value={v.boss_pass_pct} onChange={set("boss_pass_pct")} />
      </Field>
      <Field label="Boss intro" className="md:col-span-2">
        <TextArea rows={2} value={v.boss_intro} onChange={set("boss_intro")} maxLength={500} />
      </Field>
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className={hqButton("primary")}>
          Save mission
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
