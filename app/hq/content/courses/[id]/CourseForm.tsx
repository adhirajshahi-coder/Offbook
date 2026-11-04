"use client";

import { useState } from "react";
import { updateCourse } from "@/app/hq/content/actions";
import { ActionMessage, Field, Select, TextArea, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";

type Course = { id: string; title: string; short_title: string | null; promise: string; capstone: string; cohort: string; status: string };

export function CourseForm({ course }: { course: Course }) {
  const [v, setV] = useState(course);
  const { pending, msg, run } = useAction();
  const set = (k: keyof Course) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateCourse(course.id, { ...v, short_title: v.short_title ?? "", status: v.status as "draft" | "published" | "archived" }));
      }}
    >
      <Field label="Title">
        <TextInput value={v.title} onChange={set("title")} required maxLength={120} />
      </Field>
      <Field label="Short name on the map" hint="Optional, e.g. Money Mint">
        <TextInput value={v.short_title ?? ""} onChange={set("short_title")} maxLength={40} />
      </Field>
      <Field label="One-line promise" className="md:col-span-2">
        <TextInput value={v.promise} onChange={set("promise")} required maxLength={200} />
      </Field>
      <Field label="Capstone brief (solo version)" className="md:col-span-2">
        <TextArea rows={3} value={v.capstone} onChange={set("capstone")} maxLength={1000} />
      </Field>
      <Field label="School-cohort version (optional)" className="md:col-span-2" hint="Used for students who joined with a school code.">
        <TextArea rows={2} value={v.cohort} onChange={set("cohort")} maxLength={1000} />
      </Field>
      <Field label="Status" hint="Draft courses are hidden from students and the public site.">
        <Select value={v.status} onChange={set("status")}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <div className="flex items-end gap-3">
        <button type="submit" disabled={pending} className={hqButton("primary")}>
          Save course
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
