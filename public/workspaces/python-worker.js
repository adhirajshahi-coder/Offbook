/*
 * Python workspace runner (Phase 7). Runs student code in Pyodide inside a
 * Web Worker: no page access, and the page can stop it if it loops forever.
 * Each run gets a fresh namespace; checks run in the same namespace after.
 */
importScripts("/runtimes/pyodide/pyodide.js");

let py = null;
const ready = loadPyodide({ indexURL: "/runtimes/pyodide/" }).then((p) => {
  py = p;
  // input() has nothing to read in a lesson: it raises EOFError with a clear message.
  py.setStdin({ error: true });
  self.postMessage({ type: "ready" });
});

function lastLines(text, n) {
  return String(text).trim().split("\n").slice(-n).join("\n");
}

self.onmessage = async (event) => {
  const { id, code, checks } = event.data;
  await ready;
  let output = "";
  py.setStdout({ batched: (s) => (output += s + "\n") });
  py.setStderr({ batched: (s) => (output += s + "\n") });
  const ns = py.globals.get("dict")();
  try {
    await py.runPythonAsync(code, { globals: ns });
  } catch (err) {
    self.postMessage({ type: "done", id, output, error: lastLines(err.message, 4), results: checks.map((c) => ({ label: c.label, passed: false })) });
    ns.destroy();
    return;
  }
  const results = [];
  for (const c of checks) {
    let passed = true;
    if (c.outputIncludes) passed = output.includes(c.outputIncludes);
    if (passed && c.code) {
      try {
        await py.runPythonAsync(c.code, { globals: ns });
      } catch {
        passed = false;
      }
    }
    results.push({ label: c.label, passed });
  }
  ns.destroy();
  self.postMessage({ type: "done", id, output, error: null, results });
};
