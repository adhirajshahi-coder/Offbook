// A small, dependency-free load test (PRD §16 Phase 6). Hits public pages and
// the health check with N concurrent virtual users for D seconds and reports
// throughput, latency percentiles and errors. Run it against a production
// build, ideally deployed next to the database:
//   node scripts/load-test.mjs [baseUrl] [concurrency=20] [seconds=30]
const base = process.argv[2] ?? "http://localhost:3001";
const concurrency = Number(process.argv[3] ?? 20);
const seconds = Number(process.argv[4] ?? 30);
const paths = ["/", "/pricing", "/how-it-works", "/showcase", "/api/health"];

const latencies = [];
const byPath = new Map(paths.map((p) => [p, { ok: 0, err: 0, ms: [] }]));
let errors = 0;
const until = Date.now() + seconds * 1000;

async function user(id) {
  let i = id;
  while (Date.now() < until) {
    const path = paths[i++ % paths.length];
    const t = performance.now();
    try {
      const res = await fetch(base + path, { headers: { "User-Agent": "offbook-load-test" } });
      await res.arrayBuffer();
      const ms = performance.now() - t;
      latencies.push(ms);
      const s = byPath.get(path);
      s.ms.push(ms);
      if (res.ok) s.ok++;
      else {
        s.err++;
        errors++;
      }
    } catch {
      byPath.get(path).err++;
      errors++;
    }
  }
}

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor(s.length * p))]);
};

console.log(`Load test: ${base}, ${concurrency} users, ${seconds}s`);
await Promise.all(Array.from({ length: concurrency }, (_, i) => user(i)));
console.log(`Requests: ${latencies.length + errors} · ${(latencies.length / seconds).toFixed(1)} req/s · errors: ${errors}`);
console.log(`Latency ms: p50 ${pct(latencies, 0.5)} · p95 ${pct(latencies, 0.95)} · p99 ${pct(latencies, 0.99)}`);
console.table([...byPath].map(([path, s]) => ({ path, ok: s.ok, errors: s.err, p50: pct(s.ms, 0.5), p95: pct(s.ms, 0.95) })));
if (errors > latencies.length * 0.01) process.exitCode = 1;
