"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PythonContent } from "@/lib/workspaces/schemas";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import type { WorkspaceProps } from "./CodeStep";

const TIMEOUT_MS = 8000;
type Result = { label: string; passed: boolean };

/** Python in the browser (Pyodide in a Web Worker). Infinite loops are stopped after 8 seconds. */
export function PythonWorkspace({ content, onResult }: WorkspaceProps<PythonContent>) {
  const [code, setCode] = useState(content.starter);
  // The worker handler is created once, so it reads the code that was actually run from here.
  const ranCode = useRef(content.starter);
  const [status, setStatus] = useState<"loading" | "ready" | "running">("loading");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const worker = useRef<Worker | null>(null);
  const runId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Starts (or restarts) the Python worker. Callers set the loading state.
  const boot = () => {
    worker.current?.terminate();
    const w = new Worker("/workspaces/python-worker.js");
    w.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; id?: number; output?: string; error?: string | null; results?: Result[] };
      if (m.type === "ready") setStatus("ready");
      if (m.type === "done" && m.id === runId.current) {
        if (timer.current) clearTimeout(timer.current);
        setOutput(m.output ?? "");
        setError(m.error ?? null);
        setResults(m.results ?? []);
        setStatus("ready");
        const ok = !m.error && (m.results ?? []).length > 0 && (m.results ?? []).every((r) => r.passed);
        onResult({ source: ranCode.current, results: m.results ?? [] }, ok);
      }
    };
    w.onerror = () => {
      setError("Python couldn't start. Check your connection and reload the page.");
      setStatus("ready");
    };
    worker.current = w;
  };

  useEffect(() => {
    boot();
    return () => {
      worker.current?.terminate();
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run() {
    if (!worker.current || status !== "ready") return;
    runId.current += 1;
    ranCode.current = code;
    setStatus("running");
    setError(null);
    setResults(null);
    worker.current.postMessage({ id: runId.current, code, checks: content.checks });
    timer.current = setTimeout(() => {
      setError("Your code ran for too long, so it was stopped. Is there a loop that never ends?");
      setResults(content.checks.map((c) => ({ label: c.label, passed: false })));
      onResult({ source: code, results: [] }, false);
      setStatus("loading");
      boot();
    }, TIMEOUT_MS);
  }

  return (
    <div className="space-y-3">
      <CodeEditor value={content.starter} onChange={setCode} language="python" label="Python code" />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={status !== "ready"}>
          {status === "loading" ? "Loading Python…" : status === "running" ? "Running…" : "▶ Run"}
        </Button>
        {status === "loading" && <span className="text-sm text-muted">First time takes a few seconds.</span>}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Output</p>
        <pre className="mt-1 min-h-16 overflow-x-auto whitespace-pre-wrap rounded-band bg-night p-3 font-mono text-sm text-white" aria-live="polite">
          {output || (results ? "(nothing printed)" : "Press Run to see what your code prints.")}
          {error && <span className="text-[#FFB3C1]">{`\n${error}`}</span>}
        </pre>
      </div>
      {results && <Checks results={results} />}
    </div>
  );
}

export function Checks({ results }: { results: Result[] }) {
  return (
    <ul className="space-y-1" aria-label="Checks">
      {results.map((r) => (
        <li key={r.label} className={cn("flex items-center gap-2 rounded-band border-2 bg-surface px-3 py-2 text-sm", r.passed ? "border-mint" : "border-coral")}>
          <span aria-hidden>{r.passed ? "✓" : "✗"}</span>
          <span>
            {r.label}
            <span className="sr-only">{r.passed ? ": passed" : ": not yet"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
