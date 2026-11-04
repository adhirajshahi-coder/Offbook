"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useMemo, useState } from "react";
import { saveLesson } from "@/app/hq/content/actions";
import { Visual } from "@/components/kid/Visual";
import { ActionMessage, Field, Select, TextArea, TextInput, useAction } from "@/components/hq/forms";
import { Card, StatusBadge, hqButton } from "@/components/hq/ui";
import { canPublish, lessonChecks, type EditorStep } from "@/lib/hq/lesson-validation";
import { VISUAL_KEYS } from "@/supabase/seed-data/lesson-types";

export type GroupInfo = { key: string; sample: string; variants: number; published: number };
export type SkillInfo = { id: string; name: string; zone: string };
export type VideoInfo = { id: string; title: string; duration_sec: number | null };

type Keyed = EditorStep & { key: string };

const STEP_LABEL: Record<EditorStep["type"], string> = {
  study_deck: "Study cards",
  practice: "Try (practice)",
  video: "Video",
  make: "Make",
  reflect: "Reflect",
};

let counter = 0;
const newKey = () => `new-${Date.now()}-${counter++}`;

function blank(type: EditorStep["type"]): Keyed {
  const key = newKey();
  switch (type) {
    case "study_deck":
      return { key, id: null, type, content: { label: "Study", cards: [{ title: "", body: "", visual: "lightbulb" }] } };
    case "practice":
      return { key, id: null, type, content: { label: "Try", groups: [] } };
    case "video":
      return { key, id: null, type, content: { label: "Watch", video_id: null, start_sec: null, end_sec: null, min_watch_pct: 85 } };
    case "make":
      return { key, id: null, type, content: { prompt: "", rubric: [] } };
    case "reflect":
      return { key, id: null, type, content: { prompt: "What surprised you?" } };
  }
}

export function LessonEditor({
  lesson,
  steps: initialSteps,
  groups,
  skills,
  skillIds: initialSkills,
  videos,
}: {
  lesson: { id: string; title: string; summary: string; est_minutes: number; status: string; missionId: string };
  steps: EditorStep[];
  groups: GroupInfo[];
  skills: SkillInfo[];
  skillIds: string[];
  videos: VideoInfo[];
}) {
  const [title, setTitle] = useState(lesson.title);
  const [summary, setSummary] = useState(lesson.summary);
  const [minutes, setMinutes] = useState(lesson.est_minutes);
  const [steps, setSteps] = useState<Keyed[]>(() => initialSteps.map((s) => ({ ...s, key: s.id ?? newKey() }) as Keyed));
  const [skillIds, setSkillIds] = useState<string[]>(initialSkills);
  const [skillFilter, setSkillFilter] = useState("");
  const [band, setBand] = useState("explore");
  const { pending, msg, run } = useAction();

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const checks = useMemo(
    () =>
      lessonChecks({
        title,
        summary,
        steps,
        skillCount: skillIds.length,
        liveGroups: new Set(groups.filter((g) => g.published > 0).map((g) => g.key)),
        readyVideos: new Set(videos.map((v) => v.id)),
      }),
    [title, summary, steps, skillIds, groups, videos],
  );

  const update = (key: string, patch: Partial<EditorStep["content"]>) =>
    setSteps((list) => list.map((s) => (s.key === key ? ({ ...s, content: { ...s.content, ...patch } } as Keyed) : s)));
  const move = (key: string, dir: -1 | 1) =>
    setSteps((list) => {
      const i = list.findIndex((s) => s.key === key);
      const j = i + dir;
      return j < 0 || j >= list.length ? list : arrayMove(list, i, j);
    });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setSteps((list) => arrayMove(list, list.findIndex((s) => s.key === e.active.id), list.findIndex((s) => s.key === e.over!.id)));
  }

  function save(publish?: "publish" | "unpublish") {
    run(() =>
      saveLesson(lesson.id, {
        title,
        summary,
        est_minutes: minutes,
        steps: steps.map((s) => {
          const step: Partial<Keyed> = { ...s };
          delete step.key;
          return step as EditorStep;
        }),
        skillIds,
        publish,
      }),
    );
  }

  const zones = [...new Set(skills.map((s) => s.zone))];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <Card title="Lesson details" actions={<StatusBadge status={lesson.status} />}>
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <Field label="Title">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Minutes">
              <TextInput type="number" min={1} max={30} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </Field>
            <Field label="Summary" className="md:col-span-2">
              <TextArea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} />
            </Field>
          </div>
        </Card>

        <Card title="Steps" actions={<span className="text-xs text-[#6b6778]">Drag to reorder, or use the arrows</span>}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={steps.map((s) => s.key)} strategy={verticalListSortingStrategy}>
              <ol className="flex flex-col gap-3">
                {steps.map((s, i) => (
                  <SortableStep
                    key={s.key}
                    step={s}
                    index={i}
                    total={steps.length}
                    onMove={(d) => move(s.key, d)}
                    onRemove={() => {
                      if (!s.id || window.confirm("Remove this step? Students' progress on it is removed too.")) setSteps((l) => l.filter((x) => x.key !== s.key));
                    }}
                  >
                    <StepBody step={s} groups={groups} videos={videos} lessonId={lesson.id} onChange={(patch) => update(s.key, patch)} />
                  </SortableStep>
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(STEP_LABEL) as EditorStep["type"][]).map((t) => (
              <button key={t} type="button" className={hqButton("secondary")} onClick={() => setSteps((l) => [...l, blank(t)])}>
                + {STEP_LABEL[t]}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card title="Publish">
          <ul className="space-y-1.5 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex gap-2">
                <span aria-hidden className={c.ok ? "text-[#1f6b2a]" : "text-[#b4233f]"}>
                  {c.ok ? "✓" : "✗"}
                </span>
                <span className={c.ok ? "" : "text-[#b4233f]"}>
                  {c.label}
                  <span className="sr-only">{c.ok ? " (done)" : " (missing)"}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {lesson.status === "published" ? (
              <>
                <button type="button" disabled={pending || !canPublish(checks)} onClick={() => save()} className={hqButton("primary")}>
                  Save (students see it straight away)
                </button>
                <button type="button" disabled={pending} onClick={() => save("unpublish")} className={hqButton("danger")}>
                  Unpublish
                </button>
              </>
            ) : (
              <>
                <button type="button" disabled={pending} onClick={() => save()} className={hqButton("secondary")}>
                  Save draft
                </button>
                <button type="button" disabled={pending || !canPublish(checks)} onClick={() => save("publish")} className={hqButton("primary")}>
                  Publish
                </button>
              </>
            )}
            <ActionMessage msg={msg} />
          </div>
          <div className="mt-4 border-t border-[#eeecf2] pt-3">
            <Field label="Preview as a student in">
              <Select value={band} onChange={(e) => setBand(e.target.value)}>
                <option value="explore">Explore (classes 6–8)</option>
                <option value="build">Build (classes 9–10)</option>
                <option value="launch">Launch (classes 11–12)</option>
              </Select>
            </Field>
            <Link href={`/hq/content/lessons/${lesson.id}/preview?band=${band}`} className={hqButton("secondary", "mt-2 w-full")} target="_blank">
              Preview as student
            </Link>
            <p className="mt-1 text-xs text-[#6b6778]">Shows the last saved version. Nothing you do in preview is recorded.</p>
          </div>
        </Card>

        <Card title={`Skills (${skillIds.length})`}>
          <TextInput placeholder="Filter skills" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} aria-label="Filter skills" />
          <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
            {zones.map((z) => {
              const list = skills.filter((s) => s.zone === z && s.name.toLowerCase().includes(skillFilter.toLowerCase()));
              if (!list.length) return null;
              return (
                <fieldset key={z}>
                  <legend className="text-xs font-semibold text-[#6b6778]">{z}</legend>
                  {list.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={skillIds.includes(s.id)}
                        onChange={(e) => setSkillIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
                        className="accent-violet-600"
                      />
                      {s.name}
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
          <Link href="/hq/content/skills" className="mt-2 inline-block text-xs font-semibold text-violet-700 hover:underline">
            Manage skills and links
          </Link>
        </Card>
      </aside>
    </div>
  );
}

function SortableStep({
  step,
  index,
  total,
  onMove,
  onRemove,
  children,
}: {
  step: Keyed;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.key });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="rounded-lg border border-[#e4e2ea] bg-[#fdfcff]"
    >
      <div className="flex items-center gap-2 border-b border-[#eeecf2] px-3 py-2">
        <button type="button" className="cursor-grab rounded px-1 text-[#6b6778] hover:bg-[#f4f2f8]" aria-label={`Drag step ${index + 1}`} {...attributes} {...listeners}>
          ⠿
        </button>
        <span className="text-sm font-semibold">
          {index + 1}. {STEP_LABEL[step.type]}
          {"label" in step.content && step.content.label ? ` · ${step.content.label}` : ""}
        </span>
        <span className="ml-auto flex gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className={hqButton("ghost", "h-7 px-2")} aria-label="Move step up">
            ↑
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className={hqButton("ghost", "h-7 px-2")} aria-label="Move step down">
            ↓
          </button>
          <button type="button" onClick={onRemove} className={hqButton("ghost", "h-7 px-2 text-[#b4233f]")}>
            Remove
          </button>
        </span>
      </div>
      <div className="p-3">{children}</div>
    </li>
  );
}

function StepBody({
  step,
  groups,
  videos,
  lessonId,
  onChange,
}: {
  step: Keyed;
  groups: GroupInfo[];
  videos: VideoInfo[];
  lessonId: string;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  switch (step.type) {
    case "study_deck": {
      const cards = step.content.cards;
      const setCard = (i: number, patch: Partial<(typeof cards)[number]>) => onChange({ cards: cards.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
      return (
        <div className="space-y-3">
          <Field label="Label shown to students" hint='e.g. "Study" or "Twist"'>
            <TextInput value={step.content.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} maxLength={30} />
          </Field>
          {cards.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-[#eeecf2] bg-white p-2 md:grid-cols-[1fr_170px]">
              <div className="space-y-2">
                <TextInput aria-label={`Card ${i + 1} title`} placeholder="Card title (under 8 words)" value={c.title} onChange={(e) => setCard(i, { title: e.target.value })} maxLength={80} />
                <TextArea aria-label={`Card ${i + 1} text`} rows={2} placeholder="1 to 3 short sentences" value={c.body} onChange={(e) => setCard(i, { body: e.target.value })} maxLength={400} />
                {c.title.trim().split(/\s+/).length > 8 && <p className="text-xs text-[#7a5410]">Titles read best under 8 words.</p>}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Visual name={c.visual} className="h-10 w-10 text-ink" />
                  <Select aria-label={`Card ${i + 1} illustration`} value={c.visual} onChange={(e) => setCard(i, { visual: e.target.value })}>
                    {VISUAL_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex gap-1">
                  <button type="button" disabled={i === 0} className={hqButton("ghost", "h-7 px-2")} aria-label="Move card up" onClick={() => onChange({ cards: arrayMove(cards, i, i - 1) })}>
                    ↑
                  </button>
                  <button type="button" disabled={i === cards.length - 1} className={hqButton("ghost", "h-7 px-2")} aria-label="Move card down" onClick={() => onChange({ cards: arrayMove(cards, i, i + 1) })}>
                    ↓
                  </button>
                  <button type="button" className={hqButton("ghost", "h-7 px-2 text-[#b4233f]")} onClick={() => onChange({ cards: cards.filter((_, k) => k !== i) })}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className={hqButton("secondary")} onClick={() => onChange({ cards: [...cards, { title: "", body: "", visual: "lightbulb" }] })} disabled={cards.length >= 12}>
            + Card
          </button>
          <p className="text-xs text-[#6b6778]">Aim for 5 to 8 cards, one idea each. End the deck so it leads into the Try step.</p>
        </div>
      );
    }
    case "practice": {
      const selected = step.content.groups;
      return (
        <div className="space-y-2">
          <Field label="Label shown to students">
            <TextInput value={step.content.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} maxLength={30} />
          </Field>
          <p className="text-xs text-[#6b6778]">Pick the question groups for this step, in order. Students get one variant of each, and a fresh variant after a mistake.</p>
          {groups.length === 0 && <p className="text-sm text-[#6b6778]">This lesson has no questions yet.</p>}
          <ul className="space-y-1">
            {groups.map((g) => (
              <li key={g.key}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 accent-violet-600"
                    checked={selected.includes(g.key)}
                    onChange={(e) => onChange({ groups: e.target.checked ? [...selected, g.key] : selected.filter((k) => k !== g.key) })}
                  />
                  <span>
                    <span className="font-mono text-xs text-[#6b6778]">{g.key}</span> {g.sample}
                    <span className="ml-1 text-xs text-[#6b6778]">
                      ({g.variants} variants{g.published < g.variants ? `, ${g.published} published` : ""})
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Link href={`/hq/content/questions/new?lesson=${lessonId}`} className="text-xs font-semibold text-violet-700 hover:underline" target="_blank">
            + New question group
          </Link>
        </div>
      );
    }
    case "video":
      return (
        <div className="grid gap-2 md:grid-cols-3">
          <Field label="Video" className="md:col-span-3">
            <Select value={step.content.video_id ?? ""} onChange={(e) => onChange({ video_id: e.target.value || null })}>
              <option value="">Choose a ready video…</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                  {v.duration_sec ? ` (${Math.floor(v.duration_sec / 60)}:${String(v.duration_sec % 60).padStart(2, "0")})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start at (seconds)" hint="For Twist clips">
            <TextInput type="number" min={0} value={step.content.start_sec ?? ""} onChange={(e) => onChange({ start_sec: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
          <Field label="End at (seconds)">
            <TextInput type="number" min={0} value={step.content.end_sec ?? ""} onChange={(e) => onChange({ end_sec: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
          <Field label="Must watch (%)">
            <TextInput type="number" min={0} max={100} value={step.content.min_watch_pct ?? 85} onChange={(e) => onChange({ min_watch_pct: Number(e.target.value) })} />
          </Field>
          <Link href="/hq/content/videos" className="text-xs font-semibold text-violet-700 hover:underline md:col-span-3" target="_blank">
            Upload a new video
          </Link>
        </div>
      );
    case "make":
      return (
        <div className="space-y-2">
          <Field label="Prompt" hint="A tiny real-life task. Saved to the student's portfolio drafts.">
            <TextArea rows={3} value={step.content.prompt} onChange={(e) => onChange({ prompt: e.target.value })} maxLength={600} />
          </Field>
          <Field label="Checklist (one per line)">
            <TextArea
              rows={3}
              value={step.content.rubric.join("\n")}
              onChange={(e) => onChange({ rubric: e.target.value.split("\n").map((l) => l.trimStart()).filter((l, i, a) => l || i < a.length - 1).slice(0, 6) })}
            />
          </Field>
        </div>
      );
    case "reflect":
      return (
        <Field label="Question" hint="Optional for students; private to them and their parent.">
          <TextInput value={step.content.prompt} onChange={(e) => onChange({ prompt: e.target.value })} maxLength={200} />
        </Field>
      );
  }
}
