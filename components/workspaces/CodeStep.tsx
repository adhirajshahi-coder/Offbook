"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { celebrate } from "@/lib/client/feedback";
import type { BlocksContent, CodeAttempt, CodeStepType, PythonContent, SqlContent, WebContent } from "@/lib/workspaces/schemas";

export type WorkspaceProps<C> = { content: C; onResult: (attempt: CodeAttempt, passed: boolean) => void };

// Each workspace (and its library) loads only when a lesson reaches it.
const loading = () => <p className="rounded-band bg-surface p-6 text-center text-muted">Setting up the workspace…</p>;
const Blocks = dynamic(() => import("./BlocksWorkspace").then((m) => m.BlocksWorkspace), { ssr: false, loading });
const Python = dynamic(() => import("./PythonWorkspace").then((m) => m.PythonWorkspace), { ssr: false, loading });
const Web = dynamic(() => import("./WebWorkspace").then((m) => m.WebWorkspace), { ssr: false, loading });
const Sql = dynamic(() => import("./SqlWorkspace").then((m) => m.SqlWorkspace), { ssr: false, loading });

/** A coding step in the lesson player: prompt, workspace, hints, then Continue once every check passes. */
export function CodeStep({ type, content, onDone }: { type: CodeStepType; content: unknown; onDone: (attempt: CodeAttempt) => Promise<void> }) {
  const [passed, setPassed] = useState<CodeAttempt | null>(null);
  const [hints, setHints] = useState(0);
  const [busy, setBusy] = useState(false);
  const c = content as { prompt: string; hints: string[]; explanation: string } | null;

  if (!c) return <p className="rounded-band bg-surface p-6 text-muted">This step is still being set up. You can come back to it later.</p>;

  const onResult = (attempt: CodeAttempt, ok: boolean) => {
    if (ok && !passed) celebrate("small");
    setPassed(ok ? attempt : null);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">{c.prompt}</p>
      {type === "code_blocks" && <Blocks content={content as BlocksContent} onResult={onResult} />}
      {type === "code_python" && <Python content={content as PythonContent} onResult={onResult} />}
      {type === "code_web" && <Web content={content as WebContent} onResult={onResult} />}
      {type === "sql" && <Sql content={content as SqlContent} onResult={onResult} />}

      {c.hints.length > 0 && !passed && (
        <div className="space-y-2">
          {c.hints.slice(0, hints).map((h, i) => (
            <p key={i} className="rounded-band border-l-4 border-sky bg-surface p-3 text-sm">
              <strong>Hint {i + 1}:</strong> {h}
            </p>
          ))}
          {hints < c.hints.length && (
            <button type="button" className="text-sm font-semibold underline underline-offset-4" onClick={() => setHints((n) => n + 1)}>
              {hints === 0 ? "Need a hint?" : "Another hint"}
            </button>
          )}
        </div>
      )}

      {passed && (
        <div className="space-y-3" aria-live="polite">
          <p className="rounded-band border-l-4 border-mint bg-surface p-3">
            <strong>✓ It works!</strong> {c.explanation}
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDone(passed);
              setBusy(false);
            }}
          >
            {busy ? "Saving…" : "Continue"}
          </Button>
        </div>
      )}
    </div>
  );
}
