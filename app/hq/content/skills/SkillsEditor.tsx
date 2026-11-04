"use client";

import { useState } from "react";
import { ActionButton, ActionMessage, Field, Select, TextInput, useAction } from "@/components/hq/forms";
import { Card, hqButton } from "@/components/hq/ui";
import { addLink, createSkill, removeLink, updateSkill } from "./actions";

type Skill = { id: string; name: string; description: string; track_id: string; zone: string; lessons: number };
type Link = { from: string; to: string; type: "prerequisite" | "related" | "applies_in" };

const LINK_LABEL = { prerequisite: "comes before", related: "is related to", applies_in: "is used in" };

export function SkillsEditor({ skills, links, tracks }: { skills: Skill[]; links: Link[]; tracks: { id: string; zone: string }[] }) {
  const name = (id: string) => skills.find((s) => s.id === id)?.name ?? "?";
  const [link, setLink] = useState<Link>({ from: "", to: "", type: "prerequisite" });
  const [newSkill, setNewSkill] = useState({ trackId: tracks[0]?.id ?? "", name: "", description: "" });
  const linkAction = useAction();
  const skillAction = useAction();

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card title={`Skills (${skills.length})`}>
        <div className="space-y-5">
          {tracks.map((t) => {
            const list = skills.filter((s) => s.track_id === t.id);
            if (!list.length) return null;
            return (
              <div key={t.id}>
                <p className="mb-1 text-xs font-semibold text-[#6b6778]">{t.zone}</p>
                <ul className="divide-y divide-[#eeecf2]">
                  {list.map((s) => (
                    <SkillRow key={s.id} skill={s} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Add a skill">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              skillAction.run(async () => {
                const r = await createSkill(newSkill);
                if (r.ok) setNewSkill({ ...newSkill, name: "", description: "" });
                return r;
              });
            }}
          >
            <Field label="Zone">
              <Select value={newSkill.trackId} onChange={(e) => setNewSkill({ ...newSkill, trackId: e.target.value })}>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.zone}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name">
              <TextInput value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} maxLength={60} />
            </Field>
            <Field label="One-sentence description">
              <TextInput value={newSkill.description} onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })} maxLength={200} />
            </Field>
            <div className="flex items-center gap-2">
              <button className={hqButton("primary")} disabled={skillAction.pending}>
                Add skill
              </button>
              <ActionMessage msg={skillAction.msg} />
            </div>
          </form>
        </Card>

        <Card title={`Links (${links.length})`}>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              linkAction.run(() => addLink(link));
            }}
          >
            <Select aria-label="From skill" value={link.from} onChange={(e) => setLink({ ...link, from: e.target.value })}>
              <option value="">Skill…</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.zone})
                </option>
              ))}
            </Select>
            <Select aria-label="Link type" value={link.type} onChange={(e) => setLink({ ...link, type: e.target.value as Link["type"] })}>
              <option value="prerequisite">comes before (solid line)</option>
              <option value="related">is related to (dashed)</option>
              <option value="applies_in">is used in (glow, across zones)</option>
            </Select>
            <Select aria-label="To skill" value={link.to} onChange={(e) => setLink({ ...link, to: e.target.value })}>
              <option value="">Skill…</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.zone})
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-2">
              <button className={hqButton("primary")} disabled={linkAction.pending}>
                Add link
              </button>
              <ActionMessage msg={linkAction.msg} />
            </div>
          </form>
          <ul className="mt-4 max-h-96 divide-y divide-[#eeecf2] overflow-y-auto text-sm">
            {links.map((l) => (
              <li key={`${l.from}-${l.to}-${l.type}`} className="flex items-center justify-between gap-2 py-1.5">
                <span>
                  <strong>{name(l.from)}</strong> {LINK_LABEL[l.type]} <strong>{name(l.to)}</strong>
                </span>
                <ActionButton variant="ghost" className="h-7 px-2 text-[#b4233f]" onClick={() => removeLink(l)}>
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  const [v, setV] = useState({ name: skill.name, description: skill.description });
  const { pending, msg, run } = useAction();
  const dirty = v.name !== skill.name || v.description !== skill.description;
  return (
    <li id={skill.id} className="grid gap-2 py-2 md:grid-cols-[220px_1fr_auto]">
      <TextInput aria-label="Skill name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} />
      <TextInput aria-label="Skill description" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={200} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#6b6778]">{skill.lessons} lessons</span>
        {dirty && (
          <button type="button" disabled={pending} className={hqButton("secondary", "h-8")} onClick={() => run(() => updateSkill(skill.id, v))}>
            Save
          </button>
        )}
        <ActionMessage msg={msg} />
      </div>
    </li>
  );
}
