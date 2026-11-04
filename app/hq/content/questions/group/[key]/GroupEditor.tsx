"use client";

import { useState } from "react";
import { saveGroup, type VariantInput } from "@/app/hq/content/questions/actions";
import { QuestionView } from "@/components/kid/QuestionView";
import { ActionMessage, Field, Select, TextArea, TextInput, useAction } from "@/components/hq/forms";
import { Card, hqButton } from "@/components/hq/ui";
import { checkAnswer, toClient, toRow, type QuestionRow } from "@/lib/questions";
import type { QuestionSeed } from "@/supabase/seed-data/lesson-types";

type Type = QuestionSeed["type"];
const TYPES: { value: Type; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "scenario", label: "Scenario (multiple choice with a story)" },
  { value: "multi_select", label: "Pick all that apply" },
  { value: "order", label: "Put in order" },
  { value: "match_pairs", label: "Match pairs" },
  { value: "slider", label: "Slider / number" },
  { value: "short_answer", label: "Short answer (self-check)" },
];

function convert(q: QuestionSeed, type: Type): QuestionSeed {
  const base = { prompt: q.prompt, explanation: q.explanation, hint1: q.hint1, hint2: q.hint2, difficulty: q.difficulty };
  const opts = "options" in q ? q.options : "items" in q ? q.items : ["", ""];
  switch (type) {
    case "multiple_choice":
    case "scenario":
      return { ...base, type, options: opts.length >= 2 ? opts : [...opts, ""], answer: 0 };
    case "multi_select":
      return { ...base, type, options: opts.length >= 2 ? opts : [...opts, ""], answer: [0] };
    case "order":
      return { ...base, type, items: opts.length >= 3 ? opts : [...opts, "", ""].slice(0, 3) };
    case "match_pairs":
      return { ...base, type, pairs: [["", ""], ["", ""]] };
    case "slider":
      return { ...base, type, min: 0, max: 100, step: 1, unit: "", answer: 50, tolerance: 0 };
    case "short_answer":
      return { ...base, type, checklist: [""], minLength: 20 };
  }
}

const blankVariant = (from?: QuestionSeed): VariantInput => ({
  id: null,
  seed: from ? { ...structuredClone(from), prompt: "" } : { type: "multiple_choice", prompt: "", options: ["", ""], answer: 0, explanation: "", hint1: "", hint2: "", difficulty: 1 },
});

export function GroupEditor({
  groupKey,
  initial,
  skills,
  skillId: initialSkill,
  status: initialStatus,
}: {
  groupKey: string;
  initial: VariantInput[];
  skills: { id: string; name: string; zone: string }[];
  skillId: string | null;
  status: "draft" | "published";
}) {
  const [variants, setVariants] = useState<VariantInput[]>(initial);
  const [skillId, setSkillId] = useState(initialSkill);
  const [status, setStatus] = useState(initialStatus);
  const { pending, msg, run } = useAction();

  const setSeed = (i: number, seed: QuestionSeed) => setVariants((v) => v.map((x, k) => (k === i ? { ...x, seed } : x)));

  return (
    <div className="space-y-4">
      <Card title="Group settings">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Skill this tests">
            <Select value={skillId ?? ""} onChange={(e) => setSkillId(e.target.value || null)}>
              <option value="">No skill</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.zone}: {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" hint="Only published questions reach students.">
            <Select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
          <Field label="Group key">
            <TextInput value={groupKey} readOnly className="font-mono text-xs" />
          </Field>
        </div>
      </Card>

      {variants.map((v, i) => (
        <Card
          key={v.id ?? `new-${i}`}
          title={`Variant ${i + 1}`}
          actions={
            variants.length > 1 && (
              <button type="button" className={hqButton("ghost", "h-7 text-[#b4233f]")} onClick={() => setVariants((list) => list.filter((_, k) => k !== i))}>
                Remove
              </button>
            )
          }
        >
          <VariantEditor seed={v.seed} onChange={(s) => setSeed(i, s)} />
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={hqButton("secondary")} disabled={variants.length >= 5} onClick={() => setVariants((v) => [...v, blankVariant(v[v.length - 1]?.seed)])}>
          + Variant (copies the last one)
        </button>
        <span className="text-xs text-[#6b6778]">Aim for 3 variants: same idea, different numbers, wording or context.</span>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-[#e4e2ea] bg-[#f7f6fa] py-3">
        <button type="button" disabled={pending} className={hqButton("primary")} onClick={() => run(() => saveGroup(groupKey, { skillId, status, variants }))}>
          Save group
        </button>
        <ActionMessage msg={msg} />
      </div>
    </div>
  );
}

function Lines({ label, values, onChange, min = 2, max = 8 }: { label: string; values: string[]; onChange: (v: string[]) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-[#4f4b5c]">{label}</p>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <TextInput aria-label={`${label} ${i + 1}`} value={v} onChange={(e) => onChange(values.map((x, k) => (k === i ? e.target.value : x)))} maxLength={200} />
          <button type="button" disabled={values.length <= min} className={hqButton("ghost", "px-2")} aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(values.filter((_, k) => k !== i))}>
            ✕
          </button>
        </div>
      ))}
      {values.length < max && (
        <button type="button" className={hqButton("ghost", "h-7 px-2 text-xs")} onClick={() => onChange([...values, ""])}>
          + Add
        </button>
      )}
    </div>
  );
}

function VariantEditor({ seed, onChange }: { seed: QuestionSeed; onChange: (s: QuestionSeed) => void }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const patch = (p: Partial<QuestionSeed>) => onChange({ ...seed, ...p } as QuestionSeed);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
          <Field label="Type">
            <Select value={seed.type} onChange={(e) => onChange(convert(seed, e.target.value as Type))}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={seed.difficulty} onChange={(e) => patch({ difficulty: Number(e.target.value) as 1 | 2 | 3 })}>
              <option value={1}>1 Easy</option>
              <option value={2}>2 Medium</option>
              <option value={3}>3 Hard</option>
            </Select>
          </Field>
        </div>
        <Field label="Question">
          <TextArea rows={2} value={seed.prompt} onChange={(e) => patch({ prompt: e.target.value })} maxLength={600} />
        </Field>

        {(seed.type === "multiple_choice" || seed.type === "scenario") && (
          <>
            <Lines label="Options" values={seed.options} onChange={(options) => onChange({ ...seed, options, answer: Math.min(seed.answer, options.length - 1) })} />
            <Field label="Correct option">
              <Select value={seed.answer} onChange={(e) => onChange({ ...seed, answer: Number(e.target.value) })}>
                {seed.options.map((o, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {o || "(empty)"}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        {seed.type === "multi_select" && (
          <>
            <Lines label="Options" values={seed.options} onChange={(options) => onChange({ ...seed, options, answer: seed.answer.filter((a) => a < options.length) })} />
            <fieldset>
              <legend className="text-xs font-semibold text-[#4f4b5c]">Correct options</legend>
              {seed.options.map((o, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-violet-600"
                    checked={seed.answer.includes(i)}
                    onChange={(e) => onChange({ ...seed, answer: e.target.checked ? [...seed.answer, i] : seed.answer.filter((a) => a !== i) })}
                  />
                  {i + 1}. {o || "(empty)"}
                </label>
              ))}
            </fieldset>
          </>
        )}
        {seed.type === "order" && <Lines label="Items, in the correct order" values={seed.items} min={3} onChange={(items) => onChange({ ...seed, items })} />}
        {seed.type === "match_pairs" && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#4f4b5c]">Pairs (left matches right)</p>
            {seed.pairs.map(([l, r], i) => (
              <div key={i} className="flex gap-2">
                <TextInput aria-label={`Left ${i + 1}`} value={l} onChange={(e) => onChange({ ...seed, pairs: seed.pairs.map((p, k) => (k === i ? [e.target.value, p[1]] : p)) })} />
                <TextInput aria-label={`Right ${i + 1}`} value={r} onChange={(e) => onChange({ ...seed, pairs: seed.pairs.map((p, k) => (k === i ? [p[0], e.target.value] : p)) })} />
                <button type="button" disabled={seed.pairs.length <= 2} className={hqButton("ghost", "px-2")} aria-label={`Remove pair ${i + 1}`} onClick={() => onChange({ ...seed, pairs: seed.pairs.filter((_, k) => k !== i) })}>
                  ✕
                </button>
              </div>
            ))}
            {seed.pairs.length < 6 && (
              <button type="button" className={hqButton("ghost", "h-7 px-2 text-xs")} onClick={() => onChange({ ...seed, pairs: [...seed.pairs, ["", ""]] })}>
                + Add pair
              </button>
            )}
          </div>
        )}
        {seed.type === "slider" && (
          <div className="grid grid-cols-3 gap-2">
            {(["min", "max", "step", "answer", "tolerance"] as const).map((k) => (
              <Field key={k} label={k === "tolerance" ? "Allowed ±" : k[0].toUpperCase() + k.slice(1)}>
                <TextInput type="number" value={seed[k]} onChange={(e) => onChange({ ...seed, [k]: Number(e.target.value) })} />
              </Field>
            ))}
            <Field label="Unit">
              <Select value={seed.unit} onChange={(e) => onChange({ ...seed, unit: e.target.value as "₹" | "%" | "" })}>
                <option value="">None</option>
                <option value="₹">₹</option>
                <option value="%">%</option>
              </Select>
            </Field>
          </div>
        )}
        {seed.type === "short_answer" && (
          <>
            <Lines label="Checklist shown to the student" values={seed.checklist} min={1} onChange={(checklist) => onChange({ ...seed, checklist })} />
            <Field label="Minimum characters">
              <TextInput type="number" min={1} value={seed.minLength} onChange={(e) => onChange({ ...seed, minLength: Number(e.target.value) })} />
            </Field>
          </>
        )}

        <Field label={`"Here's why" explanation`} hint="Shown after every answer. Kind, specific, never 'wrong'.">
          <TextArea rows={2} value={seed.explanation} onChange={(e) => patch({ explanation: e.target.value })} maxLength={600} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hint 1 (a nudge)">
            <TextInput value={seed.hint1} onChange={(e) => patch({ hint1: e.target.value })} maxLength={200} />
          </Field>
          <Field label="Hint 2 (partial answer)">
            <TextInput value={seed.hint2} onChange={(e) => patch({ hint2: e.target.value })} maxLength={200} />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-[#d9d6e2] p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-[#6b6778]">How students see it</p>
          <button type="button" className={hqButton("ghost", "h-7 text-xs")} onClick={() => { setTesting((t) => !t); setResult(null); }}>
            {testing ? "Stop testing" : "Test it"}
          </button>
        </div>
        {seed.prompt.trim() ? (
          <div data-band="explore" className="rounded-lg bg-bg p-3 text-text">
            <QuestionView
              key={JSON.stringify(seed)}
              question={toClient({ id: "preview", ...toRow(seed), explanation: "", hint1: null, hint2: null, difficulty: 1, variant_group: null, skill_id: null } as QuestionRow)}
              disabled={!testing}
              onSubmit={(r) => setResult(checkAnswer(toRow(seed), r))}
            />
            {result !== null && (
              <p role="status" className="mt-2 text-sm font-semibold">
                {result ? "✓ That checks as correct." : "✗ That checks as not correct."} {seed.explanation}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#6b6778]">Write the question to see a preview.</p>
        )}
      </div>
    </div>
  );
}
