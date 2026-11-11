"use client";

import { useState } from "react";
import { hqButton, hqTextarea } from "@/components/hq/ui";
import { CODE_SCHEMAS, type CodeStepType } from "@/lib/workspaces/schemas";
import { codeTemplate } from "@/lib/workspaces/templates";

const HELP: Record<CodeStepType, string> = {
  code_blocks: "grid: rows using S (start, facing right), G (goal), # (wall), . (floor). maxBlocks: optional limit. allowRepeat: show the repeat block.",
  code_python: "starter: code students begin with. checks: each has a label and either code (Python that must not raise, e.g. assert) or outputIncludes (text the program must print).",
  code_web: "html / css / js: starting files. tabs: which files students edit. checks: a CSS selector, plus optional text, style {property, value} (computed, e.g. rgb(...)) or count.",
  sql: "schema: CREATE TABLE + INSERT statements, rebuilt fresh on every run. expected: the rows a correct query returns. ordered: whether row order matters.",
};

/** JSON editor for a coding step, validated live against the same schema the player uses. */
export function CodeStepEditor({ type, content, onChange }: { type: CodeStepType; content: Record<string, unknown>; onChange: (patch: Record<string, unknown>) => void }) {
  const [text, setText] = useState(() => JSON.stringify(content, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const parsed = (() => {
    try {
      return { ok: true as const, value: JSON.parse(text) as Record<string, unknown> };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  })();
  const check = parsed.ok ? CODE_SCHEMAS[type].safeParse(parsed.value) : null;
  const issues = check && !check.success ? check.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "content"}: ${i.message}`) : [];

  const apply = (value: Record<string, unknown>) => {
    // Replace the whole content: keys that were removed become undefined and drop out on save.
    const removed = Object.fromEntries(Object.keys(content).filter((k) => !(k in value)).map((k) => [k, undefined]));
    onChange({ ...removed, ...value });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#6b6778]">{HELP[type]}</p>
      <textarea
        aria-label="Step content (JSON)"
        spellCheck={false}
        rows={14}
        className={`${hqTextarea} font-mono text-xs`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const v = JSON.parse(e.target.value) as Record<string, unknown>;
            setParseError(null);
            apply(v);
          } catch (err) {
            setParseError((err as Error).message);
          }
        }}
      />
      {parseError && <p className="text-xs text-[#b4233f]">JSON: {parseError}</p>}
      {issues.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-[#b4233f]">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
      {!parseError && issues.length === 0 && <p className="text-xs text-[#1f6b2a]">Looks good. Use Preview to try it as a student.</p>}
      <button
        type="button"
        className={hqButton("ghost", "h-7 px-2 text-xs")}
        onClick={() => {
          if (!window.confirm("Replace this step with the example content?")) return;
          const t = codeTemplate(type) as unknown as Record<string, unknown>;
          setText(JSON.stringify(t, null, 2));
          setParseError(null);
          apply(t);
        }}
      >
        Reset to example
      </button>
    </div>
  );
}
