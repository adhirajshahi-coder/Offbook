/**
 * npm run db:push [-- --dry-run | --yes]
 * Applies supabase/migrations to the hosted project using the DB password
 * from .env.local, so no `supabase login` access token is needed.
 */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const ref = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!ref || !password) {
  console.error("Set SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD in .env.local first.");
  process.exit(1);
}

const dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
const result = spawnSync("npx", ["supabase", "db", "push", "--remote", dbUrl, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
