// Lighthouse (mobile) for key pages against a production build.
//   npx next build && npx next start -p 3001
//   node scripts/lighthouse.mjs [baseUrl] [--cookie "name=value; ..."] [paths...]
// Prints performance / accessibility / best practices / SEO and the top issues.
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const args = process.argv.slice(2);
const base = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3001";
const ci = args.indexOf("--cookie");
const cookie = ci >= 0 ? args.splice(ci, 2)[1] : null;
const paths = args.length ? args : ["/", "/pricing", "/schools", "/how-it-works", "/showcase", "/login"];

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  chromeFlags: ["--headless=new", "--no-sandbox"],
});
const rows = [];
try {
  for (const path of paths) {
    const r = await lighthouse(`${base}${path}`, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}),
    });
    const c = r.lhr.categories;
    const score = (k) => Math.round((c[k]?.score ?? 0) * 100);
    const failing = Object.values(r.lhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "notApplicable" && a.scoreDisplayMode !== "manual")
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, 6)
      .map((a) => `${a.id}${a.displayValue ? ` (${a.displayValue})` : ""}`);
    rows.push({
      path,
      perf: score("performance"),
      a11y: score("accessibility"),
      bp: score("best-practices"),
      seo: score("seo"),
      lcp: r.lhr.audits["largest-contentful-paint"]?.displayValue,
      issues: failing.join(", "),
    });
    console.log(JSON.stringify(rows.at(-1)));
  }
} finally {
  await chrome.kill();
}
console.table(rows.map((r) => ({ path: r.path, perf: r.perf, a11y: r.a11y, bp: r.bp, seo: r.seo, lcp: r.lcp })));
