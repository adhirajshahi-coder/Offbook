"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { WebContent } from "@/lib/workspaces/schemas";
import { cn } from "@/lib/utils";
import { CodeEditor } from "./CodeEditor";
import type { WorkspaceProps } from "./CodeStep";
import { Checks } from "./PythonWorkspace";

type Check = WebContent["checks"][number];

// Runs inside the preview. Answers check requests from the parent page only.
const CHECKER = `<script>
window.addEventListener("error", function (e) { parent.postMessage({ type: "offbook-error", message: String(e.message) }, "*"); });
window.addEventListener("message", function (e) {
  if (!e.data || e.data.type !== "offbook-check") return;
  var results = e.data.checks.map(function (c) {
    try {
      var els = document.querySelectorAll(c.selector);
      var ok = els.length >= (c.count || 1);
      if (ok && c.text) ok = Array.prototype.some.call(els, function (el) { return el.textContent.toLowerCase().indexOf(c.text.toLowerCase()) >= 0; });
      if (ok && c.style) ok = Array.prototype.some.call(els, function (el) { return getComputedStyle(el).getPropertyValue(c.style.property).trim() === c.style.value; });
      return { label: c.label, passed: !!ok };
    } catch (err) { return { label: c.label, passed: false }; }
  });
  parent.postMessage({ type: "offbook-results", results: results }, "*");
});
<\/script>`;

function page(htmlSrc: string, cssSrc: string, jsSrc: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${CHECKER}<style>body{font-family:system-ui,sans-serif;margin:12px}${cssSrc}</style></head><body>${htmlSrc}<script>${jsSrc.replace(/<\/script/gi, "<\\/script")}<\/script></body></html>`;
}

/**
 * HTML/CSS/JS editor with a live preview in a sandboxed iframe (scripts only:
 * no access to the page, cookies, forms or pop-ups).
 */
export function WebWorkspace({ content, onResult }: WorkspaceProps<WebContent>) {
  const [src, setSrc] = useState({ html: content.html, css: content.css, js: content.js });
  const [tab, setTab] = useState<"html" | "css" | "js">(content.tabs[0]);
  const [debounced, setDebounced] = useState(src);
  const [results, setResults] = useState<{ label: string; passed: boolean }[] | null>(null);
  const [jsError, setJsError] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(src), 400);
    return () => clearTimeout(t);
  }, [src]);
  const doc = useMemo(() => page(debounced.html, debounced.css, debounced.js), [debounced]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "offbook-error") setJsError(String(e.data.message).slice(0, 200));
      if (e.data?.type === "offbook-results") {
        const r = (e.data.results as { label: string; passed: boolean }[]).slice(0, content.checks.length);
        setResults(r);
        const source = `<!-- html -->\n${src.html}\n/* css */\n${src.css}\n// js\n${src.js}`;
        onResult({ source, results: r }, r.length === content.checks.length && r.every((x) => x.passed));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [content.checks.length, onResult, src]);

  function check() {
    setResults(null);
    // Check what's on screen now: refresh the preview first if typing is ahead of it.
    if (debounced !== src) setDebounced(src);
    setTimeout(() => frame.current?.contentWindow?.postMessage({ type: "offbook-check", checks: content.checks satisfies Check[] }, "*"), debounced !== src ? 300 : 0);
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Files" className="flex gap-1">
        {content.tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("rounded-full px-3 py-1 text-sm font-semibold", tab === t ? "bg-accent text-on-accent" : "border border-line bg-surface")}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          {content.tabs.map((t) => (
            <div key={t} hidden={tab !== t}>
              <CodeEditor value={src[t]} onChange={(v) => setSrc((s) => ({ ...s, [t]: v }))} language={t} label={`${t.toUpperCase()} code`} minHeight={240} />
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Preview</p>
          <iframe ref={frame} title="Your page" sandbox="allow-scripts" srcDoc={doc} onLoad={() => setJsError(null)} className="mt-1 h-64 w-full rounded-band border border-line bg-white md:h-[240px]" />
          {jsError && <p className="mt-1 text-sm text-coral">JavaScript error: {jsError}</p>}
        </div>
      </div>
      <Button onClick={check}>Check my page</Button>
      {results && <Checks results={results} />}
    </div>
  );
}
