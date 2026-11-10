/**
 * Test-only: mint real session cookies for a seeded user, so Lighthouse and
 * Playwright can measure and drive signed-in pages without email codes.
 * Uses the service role from .env.local; never ship this anywhere public.
 *
 *   npx tsx scripts/test-session.ts parent@demo.offbook.test [ChildName]
 *   → prints a Cookie header value
 */
import { createHmac } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

export type TestCookie = { name: string; value: string };

const CHUNK = 3180; // @supabase/ssr's cookie chunk size

export async function sessionCookies(email: string, childName?: string): Promise<TestCookie[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link.properties?.hashed_token) throw new Error(error?.message ?? "No link");
  const { data, error: verifyError } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (verifyError || !data.session) throw new Error(verifyError?.message ?? "No session");

  const ref = new URL(url).hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(data.session)).toString("base64url")}`;
  const cookies: TestCookie[] =
    value.length <= CHUNK ? [{ name, value }] : Array.from({ length: Math.ceil(value.length / CHUNK) }, (_, i) => ({ name: `${name}.${i}`, value: value.slice(i * CHUNK, (i + 1) * CHUNK) }));

  if (childName) {
    const { data: child } = await admin.from("students").select("id").eq("parent_id", data.user!.id).eq("display_name", childName).single();
    if (!child) throw new Error(`No child ${childName}`);
    const payload = `${data.user!.id}.${child.id}.${Date.now()}`;
    const sig = createHmac("sha256", process.env.STUDENT_SESSION_SECRET!).update(payload).digest("base64url");
    cookies.push({ name: "ob_student", value: `${payload}.${sig}` });
  }
  return cookies;
}

if (process.argv[1]?.endsWith("test-session.ts")) {
  const [email, child] = process.argv.slice(2);
  sessionCookies(email ?? "parent@demo.offbook.test", child)
    .then((c) => console.log(c.map((x) => `${x.name}=${x.value}`).join("; ")))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
