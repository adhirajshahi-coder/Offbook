"use client";

import { useState } from "react";
import { ActionMessage, Field, Select, TextInput, useAction } from "@/components/hq/forms";
import { Card, StatusBadge, hqButton } from "@/components/hq/ui";
import type { StaffRole } from "@/lib/auth";
import { addStaff, updateStaff } from "../actions";

const ROLES: { value: StaffRole; label: string }[] = [
  { value: "admin", label: "Admin: everything" },
  { value: "content", label: "Content: courses, lessons, questions, videos" },
  { value: "teacher", label: "Teacher: own videos only" },
  { value: "ops", label: "Ops: students, plans, refunds, reviews" },
  { value: "reviewer", label: "Reviewer: review queue only" },
  { value: "sales", label: "Sales: CRM" },
  { value: "marketing", label: "Marketing: campaigns, leads" },
  { value: "viewer", label: "Viewer: read-only reports" },
];

type Member = { id: string; name: string; email: string; role: StaffRole; active: boolean; isMe: boolean };

export function TeamEditor({ members }: { members: Member[] }) {
  const [form, setForm] = useState({ email: "", name: "", role: "content" as StaffRole });
  const add = useAction();
  return (
    <div className="space-y-4">
      <Card title="Add a team member">
        <form
          className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            add.run(async () => {
              const r = await addStaff(form);
              if (r.ok) setForm({ email: "", name: "", role: form.role });
              return r;
            });
          }}
        >
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Work email">
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <button disabled={add.pending} className={hqButton("primary")}>
            Add
          </button>
          <span className="md:col-span-4">
            <ActionMessage msg={add.msg} />
          </span>
        </form>
      </Card>
      <Card title={`Team (${members.length})`}>
        <ul className="divide-y divide-[#eeecf2]">
          {members.map((m) => (
            <MemberRow key={m.id} m={m} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function MemberRow({ m }: { m: Member }) {
  const [role, setRole] = useState(m.role);
  const [active, setActive] = useState(m.active);
  const { pending, msg, run } = useAction();
  const dirty = role !== m.role || active !== m.active;
  return (
    <li className="grid gap-2 py-2 md:grid-cols-[1fr_1fr_260px_auto] md:items-center">
      <div>
        <p className="font-semibold">
          {m.name} {m.isMe && <span className="text-xs text-[#6b6778]">(you)</span>}
        </p>
        <p className="text-xs text-[#6b6778]">{m.email}</p>
      </div>
      <div>
        <StatusBadge status={m.active ? "active" : "paused"} />
      </div>
      <div className="flex gap-2">
        <Select aria-label={`Role for ${m.name}`} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.value}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-violet-600" />
          Active
        </label>
      </div>
      <div className="flex items-center gap-2">
        {dirty && (
          <button type="button" disabled={pending} className={hqButton("secondary", "h-8")} onClick={() => run(() => updateStaff(m.id, { role, active }))}>
            Save
          </button>
        )}
        <ActionMessage msg={msg} />
      </div>
    </li>
  );
}
