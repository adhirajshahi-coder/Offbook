// Copies the in-browser runtimes into public/runtimes so they're served from
// our own domain (no third-party CDN on /play). Runs on `npm install`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const jobs = [
  ["node_modules/pyodide", "public/runtimes/pyodide", ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]],
  ["node_modules/sql.js/dist", "public/runtimes/sqljs", ["sql-wasm-browser.js", "sql-wasm-browser.wasm"]],
];
for (const [from, to, files] of jobs) {
  if (!existsSync(from)) continue;
  mkdirSync(to, { recursive: true });
  for (const f of files) copyFileSync(join(from, f), join(to, f));
}
console.log("runtimes copied to public/runtimes");
