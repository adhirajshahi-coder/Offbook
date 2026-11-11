"use client";

import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { EditorState } from "@codemirror/state";
import { EditorView, basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

export type EditorLanguage = "python" | "html" | "css" | "js" | "sql";

const LANG = { python, html, css, js: javascript, sql };

/** A small CodeMirror 6 editor: line numbers, brackets, undo, keyboard friendly. */
export function CodeEditor({ value, onChange, language, label, minHeight = 180 }: { value: string; onChange: (v: string) => void; language: EditorLanguage; label: string; minHeight?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          LANG[language](),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": label, spellcheck: "false", autocapitalize: "off" }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) latest.current(u.state.doc.toString());
          }),
          EditorView.theme({
            "&": { fontSize: "15px", backgroundColor: "#fff", borderRadius: "12px", minHeight: `${minHeight}px` },
            ".cm-content": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", minHeight: `${minHeight}px` },
            ".cm-gutters": { backgroundColor: "#f6f4fb", border: "none", borderRadius: "12px 0 0 12px" },
            "&.cm-focused": { outline: "3px solid var(--accent)" },
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // Created once per mount; parents remount with a key to reset the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className="overflow-hidden rounded-band border border-line text-ink" />;
}
