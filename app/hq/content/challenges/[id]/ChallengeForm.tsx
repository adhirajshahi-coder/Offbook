"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveChallenge } from "@/app/hq/content/play-actions";
import { ActionMessage, Field, Select, TextArea, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";

export type ChallengeValues = {
  title: string;
  type: "challenge_week" | "real_world" | "sponsored";
  brief: string;
  safety_note: string;
  rubric: string; // one line per item
  xp: number;
  track_id: string;
  required_course_id: string;
  band: string;
  starts_at: string; // datetime-local, IST
  ends_at: string;
  parent_ack_required: boolean;
  status: "draft" | "published" | "archived";
};

/** datetime-local (IST) → ISO with offset, or "" */
function toIso(local: string): string {
  return local ? `${local}:00+05:30` : "";
}

export function ChallengeForm({
  id,
  initial,
  tracks,
  courses,
}: {
  id: string | null;
  initial: ChallengeValues;
  tracks: { id: string; zone_name: string }[];
  courses: { id: string; title: string; level: number }[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const { pending, msg, run } = useAction();
  const set = (k: keyof ChallengeValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const r = await saveChallenge(id, {
            ...v,
            rubric: v.rubric.split("\n").map((l) => l.trim()).filter(Boolean),
            starts_at: toIso(v.starts_at),
            ends_at: toIso(v.ends_at),
          });
          if (r.ok && !id && r.id) router.replace(`/hq/content/challenges/${r.id}`);
          return r;
        });
      }}
    >
      <Field label="Title" className="md:col-span-2">
        <TextInput value={v.title} onChange={set("title")} required maxLength={120} />
      </Field>
      <Field label="Type">
        <Select value={v.type} onChange={set("type")}>
          <option value="real_world">Real-world challenge</option>
          <option value="challenge_week">Challenge week</option>
          <option value="sponsored">Sponsored</option>
        </Select>
      </Field>
      <Field label="XP when approved" hint="0–500">
        <TextInput type="number" min={0} max={500} value={v.xp} onChange={set("xp")} />
      </Field>
      <Field label="Brief" hint="What to do, in plain words a child can follow." className="md:col-span-2">
        <TextArea rows={5} value={v.brief} onChange={set("brief")} maxLength={3000} />
      </Field>
      <Field label="Safety note" hint="Shown to the child and to the parent before they say okay." className="md:col-span-2">
        <TextArea rows={3} value={v.safety_note} onChange={set("safety_note")} maxLength={1000} />
      </Field>
      <Field label="Rubric" hint="One line per thing reviewers check (max 10)." className="md:col-span-2">
        <TextArea rows={5} value={v.rubric} onChange={set("rubric")} />
      </Field>
      <Field label="Zone">
        <Select value={v.track_id} onChange={set("track_id")}>
          <option value="">None</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.zone_name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Opens when the student starts" hint="Leave empty for any student.">
        <Select value={v.required_course_id} onChange={set("required_course_id")}>
          <option value="">Any course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              L{c.level} · {c.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Band">
        <Select value={v.band} onChange={set("band")}>
          <option value="">All bands</option>
          <option value="explore">Explore (6–7)</option>
          <option value="build">Build (8–10)</option>
          <option value="launch">Launch (11–12)</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select value={v.status} onChange={set("status")}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <Field label="Starts (IST)" hint="Optional, for challenge weeks.">
        <TextInput type="datetime-local" value={v.starts_at} onChange={set("starts_at")} />
      </Field>
      <Field label="Ends (IST)">
        <TextInput type="datetime-local" value={v.ends_at} onChange={set("ends_at")} />
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" checked={v.parent_ack_required} onChange={(e) => setV({ ...v, parent_ack_required: e.target.checked })} />
        A parent must okay this challenge first (recommended for anything offline)
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className={hqButton("primary")}>
          {id ? "Save challenge" : "Create challenge"}
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}
