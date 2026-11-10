import { expect, test, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { sessionCookies } from "../../scripts/test-session";

/**
 * The launch-critical path (PRD §16 Phase 6): sign-up → pay → learn → unlock
 * → review. Two steps use test stand-ins and say so:
 *  - Sign-up: the account is created through the admin API, because the email
 *    code can't be read in an automated test. Everything after is the real UI.
 *  - Pay: a temporary 100% coupon takes the real free-checkout path, which
 *    activates the plan without Razorpay (test keys aren't configured yet).
 *  - Learn: the test plays the first lesson's study deck in the UI, then marks
 *    the rest of the course complete in the database to reach the capstone.
 * Everything it creates is deleted at the end.
 */

config({ path: ".env.local" });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

const stamp = Date.now();
const EMAIL = `e2e-${stamp}@offbook.test`;
const COUPON = `E2E${String(stamp).slice(-6)}`;
const CHILD = "Zoya";
const PIN = "1357";
let parentId = "";

async function signIn(context: BrowserContext, email: string, child?: string) {
  const base = new URL(test.info().project.use.baseURL ?? "http://localhost:3001");
  await context.clearCookies();
  await context.addCookies((await sessionCookies(email, child)).map((c) => ({ ...c, domain: base.hostname, path: "/", httpOnly: true, sameSite: "Lax" as const })));
}

test.beforeAll(async () => {
  const { data, error } = await db.auth.admin.createUser({ email: EMAIL, email_confirm: true, user_metadata: { kind: "parent", name: "E2E Parent" } });
  if (error) throw error;
  parentId = data.user.id;
  await db.from("coupons").insert({ code: COUPON, kind: "percent", value: 100, max_uses: 1, note: "Playwright e2e (temporary)" });
});

test.afterAll(async () => {
  await db.from("coupons").delete().eq("code", COUPON);
  if (parentId) await db.auth.admin.deleteUser(parentId);
});

test("sign-up → pay → learn → unlock → review", async ({ page, context }) => {
  // --- Sign-up: parent adds a child with consent ---------------------------
  await signIn(context, EMAIL);
  await page.goto("/parent");
  await page.getByLabel("First name or nickname").fill(CHILD);
  await page.getByLabel("Class", { exact: true }).selectOption("7");
  await page.getByLabel("4-digit PIN").fill(PIN);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add child" }).click();
  await expect(page.getByRole("status")).toContainText("Profile added");

  // --- Pay: checkout with a 100% coupon --------------------------------------
  await page.getByRole("link", { name: new RegExp(`Start ${CHILD}'s year`) }).click();
  await page.getByLabel(/School code or coupon/).fill(COUPON);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("button", { name: "Pay ₹0" })).toBeVisible();
  await page.getByRole("button", { name: "Pay ₹0" }).click();
  await page.waitForURL(/\/parent\?paid=1/);
  await expect(page.getByText(/Active until/)).toBeVisible();

  // --- Learn: open Play, enter the PIN, play the first lesson's study deck ---
  await page.goto("/play");
  // With one child the picker goes straight to the PIN; with several, pick first.
  const pick = page.getByRole("button", { name: `Play as ${CHILD}` });
  if (await pick.isVisible().catch(() => false)) await pick.click();
  await page.getByLabel("4-digit PIN").fill(PIN);
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page.getByRole("link", { name: "Play", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Play", exact: true }).click();
  await page.waitForURL(/\/play\/lesson\//);
  const lessonId = page.url().split("/play/lesson/")[1].split(/[?#]/)[0];
  for (let i = 0; i < 12; i++) {
    const tryIt = page.getByRole("button", { name: "Try it" });
    if (await tryIt.isVisible()) {
      await tryIt.click();
      break;
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  const { data: student } = await db.from("students").select("id").eq("parent_id", parentId).single();
  await expect.poll(async () => (await db.from("lesson_progress").select("lesson_id").eq("student_id", student!.id).eq("lesson_id", lessonId)).data?.length ?? 0).toBe(1);

  // Shortcut to the capstone: finish this course's lessons and missions in the DB.
  const { data: lesson } = await db.from("lessons").select("mission_id, missions(course_id, courses(slug, title))").eq("id", lessonId).single();
  const mission = lesson!.missions as unknown as { course_id: string; courses: { slug: string; title: string } };
  const { data: missions } = await db.from("missions").select("id, lessons(id)").eq("course_id", mission.course_id).eq("status", "published");
  const now = new Date().toISOString();
  for (const m of missions ?? []) {
    await db.from("lesson_progress").upsert((m.lessons as { id: string }[]).map((l) => ({ student_id: student!.id, lesson_id: l.id, completed_at: now })));
    await db.from("mission_progress").upsert({ student_id: student!.id, mission_id: m.id, quiz_best_pct: 100, quiz_passed_at: now, boss_best_pct: 100, boss_passed_at: now, completed_at: now });
  }

  // --- Submit the capstone in the UI ------------------------------------------
  await page.goto(`/play/capstone/${mission.courses.slug}`);
  await page.getByLabel(/What did you make/).fill("I made a weekly budget for our family trip. I listed needs first, saved ₹200 a week, and tracked spending in a notebook. I learned small snacks add up fast.");
  await page.getByRole("button", { name: /Send/ }).click();
  await expect(page.getByText("Sent for review!")).toBeVisible();

  // --- Review: a reviewer approves it in HQ -----------------------------------
  await signIn(context, "reviewer@demo.offbook.test");
  await page.goto("/hq/review");
  await page.getByRole("row", { name: new RegExp(CHILD) }).getByRole("link").click();
  await page.getByRole("button", { name: "Great work" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText(/Reviewed by/)).toBeVisible();

  // --- Unlock: the course is complete, a certificate exists, the path moves on --
  await expect.poll(async () => (await db.from("course_progress").select("status").eq("student_id", student!.id).eq("course_id", mission.course_id).single()).data?.status).toBe("completed");
  const { data: cert } = await db.from("certificates").select("code").eq("student_id", student!.id).single();
  expect(cert?.code).toMatch(/^OB-/);
  await signIn(context, EMAIL, CHILD);
  await page.goto("/play/journey");
  await expect(page.getByRole("link", { name: new RegExp(mission.courses.title.split(" ")[0]) }).first()).toContainText(/Done|Completed/i);
  await page.goto(`/certificates/${cert!.code}`);
  await expect(page.getByRole("heading", { name: CHILD })).toBeVisible();
});
