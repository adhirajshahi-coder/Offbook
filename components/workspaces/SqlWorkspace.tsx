"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { sameRows } from "@/lib/workspaces/blocks";
import type { SqlContent } from "@/lib/workspaces/schemas";
import { CodeEditor } from "./CodeEditor";
import type { WorkspaceProps } from "./CodeStep";

type SqlJs = { Database: new () => { exec: (sql: string) => { columns: string[]; values: unknown[][] }[]; close: () => void } };
type InitSqlJs = (config: { locateFile: (f: string) => string }) => Promise<SqlJs>;
const initFn = () => (window as unknown as { initSqlJs?: InitSqlJs }).initSqlJs;

let sqlJs: Promise<SqlJs> | null = null;
function loadSqlJs(): Promise<SqlJs> {
  sqlJs ??= new Promise<void>((resolve, reject) => {
    if (initFn()) return resolve();
    const s = document.createElement("script");
    s.src = "/runtimes/sqljs/sql-wasm-browser.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(s);
  }).then(() => initFn()!({ locateFile: (f) => `/runtimes/sqljs/${f.replace("sql-wasm.wasm", "sql-wasm-browser.wasm")}` }));
  return sqlJs;
}

/** SQLite in the browser (sql.js). Every run starts from a fresh copy of the lesson's tables. */
export function SqlWorkspace({ content, onResult }: WorkspaceProps<SqlContent>) {
  const [query, setQuery] = useState(content.starter);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<{ columns: string[]; values: unknown[][] } | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);
  const lib = useRef<SqlJs | null>(null);

  useEffect(() => {
    loadSqlJs()
      .then((l) => {
        lib.current = l;
        setReady(true);
      })
      .catch(() => setError("The SQL workspace couldn't load. Check your connection and reload."));
  }, []);

  // The tables students can query, shown above the editor.
  const [tables, setTables] = useState<{ name: string; columns: string[] }[]>([]);
  useEffect(() => {
    if (!ready || !lib.current) return;
    const db = new lib.current.Database();
    try {
      db.exec(content.schema);
      const names = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]?.values.map((v) => String(v[0])) ?? [];
      setTables(names.map((n) => ({ name: n, columns: db.exec(`PRAGMA table_info(${JSON.stringify(n)})`)[0]?.values.map((v) => String(v[1])) ?? [] })));
    } catch {
      setError("This lesson's tables have a problem. Tell your teacher!");
    } finally {
      db.close();
    }
  }, [ready, content.schema]);

  function run() {
    if (!lib.current) return;
    const db = new lib.current.Database();
    setError(null);
    try {
      db.exec(content.schema);
      const res = db.exec(query);
      const last = res[res.length - 1] ?? { columns: [], values: [] };
      setTable({ columns: last.columns, values: last.values.slice(0, 100) });
      const ok = sameRows(last.values, content.expected, content.ordered);
      setPassed(ok);
      onResult({ source: query, results: [{ label: "Query returns the right rows", passed: ok }] }, ok);
    } catch (e) {
      setTable(null);
      setPassed(false);
      setError(e instanceof Error ? e.message : "That query didn't run.");
      onResult({ source: query, results: [{ label: "Query returns the right rows", passed: false }] }, false);
    } finally {
      db.close();
    }
  }

  return (
    <div className="space-y-3">
      {tables.length > 0 && (
        <div className="rounded-band bg-surface p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Tables</p>
          <ul className="mt-1 space-y-0.5 font-mono">
            {tables.map((t) => (
              <li key={t.name}>
                <strong>{t.name}</strong>({t.columns.join(", ")})
              </li>
            ))}
          </ul>
        </div>
      )}
      <CodeEditor value={content.starter} onChange={setQuery} language="sql" label="SQL query" minHeight={120} />
      <Button onClick={run} disabled={!ready}>
        {ready ? "▶ Run query" : "Loading SQL…"}
      </Button>
      {error && (
        <p role="alert" className="rounded-band border-2 border-coral bg-surface p-3 font-mono text-sm">
          {error}
        </p>
      )}
      {table && (
        <div className="overflow-x-auto rounded-band border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {table.columns.map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.values.map((row, i) => (
                <tr key={i} className="border-t border-line">
                  {row.map((v, j) => (
                    <td key={j} className="px-3 py-1.5 font-mono">
                      {v === null ? "NULL" : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
              {table.values.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-muted">No rows.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {passed === false && table && <p className="text-sm">Oops, good try: those aren&apos;t quite the rows we&apos;re looking for. Check the filter and the columns.</p>}
    </div>
  );
}
