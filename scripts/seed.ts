/**
 * npm run seed        → upsert curriculum + demo accounts (safe to re-run)
 * npm run seed:reset  → delete demo accounts and seeded content, then seed
 *
 * Uses the service-role key from .env.local. Never run against production.
 * Phase 0 seeds the course map and demo users; later phases add missions,
 * lessons, questions, CRM data and more (PRD §9.3).
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BRIDGE, COURSES, GAMES, SLOTS, TRACKS } from "../supabase/seed-data/curriculum";
import { POLICIES } from "../supabase/seed-data/policies";
import { CONSENT_VERSION } from "../lib/consent";
import { seedContent } from "./seed-content";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false } });

const DEMO_PARENT = { email: "parent@demo.offbook.test", name: "Priya (demo)" };
const DEMO_ADMIN = { email: "admin@demo.offbook.test", name: "Asha (demo admin)" };
const DEMO_CHILDREN = [
  { name: "Aarav", classGrade: 7 },
  { name: "Meera", classGrade: 9 },
  { name: "Kabir", classGrade: 11 },
];
const DEMO_PIN = "1234";

function check<T>(label: string, result: { data: T | null; error: unknown }): NonNullable<T> {
  if (result.error) {
    console.error(`✗ ${label}`, result.error);
    process.exit(1);
  }
  return result.data as NonNullable<T>;
}

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email: string, kind: "parent" | "staff", name: string): Promise<string> {
  const existing = await findUserId(email);
  if (existing) return existing;
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { kind, name },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return data.user.id;
}

async function seedCurriculum() {
  const tracks = check(
    "tracks",
    await db
      .from("tracks")
      .upsert(
        TRACKS.map((t, i) => ({
          slug: t.slug,
          name: t.name,
          zone_name: t.zone,
          color: t.color,
          order_index: i + 1,
          status: "published",
        })),
        { onConflict: "slug" },
      )
      .select("id, slug"),
  );
  const trackId = new Map(tracks.map((t) => [t.slug, t.id]));

  // Slots are keyed by (level, position). Update in place: deleting them would
  // orphan the slot courses (they must sit on the path or in a slot).
  const existingSlots = check<{ id: string; level: number; order_index: number }[]>(
    "read slots",
    await db.from("course_slots").select("id, level, order_index"),
  );
  for (const s of SLOTS) {
    const hit = existingSlots.find((r) => r.level === s.level && r.order_index === s.order);
    if (hit) {
      check("update slot", await db.from("course_slots").update({ title: s.title }).eq("id", hit.id));
    } else {
      check("insert slot", await db.from("course_slots").insert({ level: s.level, order_index: s.order, title: s.title }));
    }
  }
  const slots = check<{ id: string; level: number; order_index: number }[]>(
    "slots",
    await db.from("course_slots").select("id, level, order_index"),
  );
  const slotId = new Map(
    SLOTS.map((s) => [s.key, slots.find((r) => r.level === s.level && r.order_index === s.order)!.id]),
  );

  const courses = check(
    "courses",
    await db
      .from("courses")
      .upsert(
        [
          ...COURSES.map((c) => ({
            slug: c.slug,
            title: c.title,
            short_title: c.shortTitle ?? null,
            track_id: trackId.get(c.track)!,
            level: c.level,
            kind: "standard",
            order_index: c.order ?? null,
            slot_id: c.slot ? slotId.get(c.slot)! : null,
            priority: c.priority,
            promise: c.promise,
            capstone: { brief: c.capstone },
            cohort_variant: c.cohort ? { brief: c.cohort } : null,
            status: "published",
          })),
          {
            slug: BRIDGE.slug,
            title: BRIDGE.title,
            short_title: "Bridge",
            track_id: trackId.get(BRIDGE.track)!,
            level: 1,
            kind: "bridge",
            order_index: null,
            slot_id: null,
            priority: "core",
            promise: BRIDGE.promise,
            capstone: { from: BRIDGE.fromCourses },
            cohort_variant: null,
            status: "published",
          },
        ],
        { onConflict: "slug" },
      )
      .select("id, slug"),
  );
  const courseId = new Map(courses.map((c) => [c.slug, c.id]));

  check(
    "games",
    await db.from("games").upsert(
      GAMES.map((g) => ({
        slug: g.slug,
        title: g.title,
        track_id: trackId.get(g.track)!,
        unlock_course_id: courseId.get(g.unlocksAt)!,
        status: "draft", // published when each game ships (Phases 4 and 6)
      })),
      { onConflict: "slug" },
    ),
  );

  console.log(`✓ ${tracks.length} tracks, ${slots.length} slots, ${courses.length} courses, ${GAMES.length} games`);
}

async function seedDemoAccounts() {
  const adminId = await ensureUser(DEMO_ADMIN.email, "staff", DEMO_ADMIN.name);
  check(
    "admin staff row",
    await db.from("staff").upsert({ id: adminId, name: DEMO_ADMIN.name, role: "admin", active: true }),
  );

  const parentId = await ensureUser(DEMO_PARENT.email, "parent", DEMO_PARENT.name);
  check(
    "demo parent",
    await db.from("parents").upsert({
      id: parentId,
      email: DEMO_PARENT.email,
      name: DEMO_PARENT.name,
      consent_version: "demo",
      consent_at: new Date().toISOString(),
    }),
  );

  const { data: existing } = await db.from("students").select("display_name").eq("parent_id", parentId);
  const have = new Set((existing ?? []).map((s) => s.display_name));
  for (const child of DEMO_CHILDREN) {
    if (have.has(child.name)) continue;
    const level = child.classGrade <= 8 ? 1 : child.classGrade <= 10 ? 2 : 3;
    const student = check<{ id: string }>(
      `student ${child.name}`,
      await db
        .from("students")
        .insert({
          parent_id: parentId,
          display_name: child.name,
          class_grade: child.classGrade,
          content_level: level,
        })
        .select("id")
        .single(),
    );
    await setPin(db, student.id, DEMO_PIN);
  }

  // Record consent for each demo child, as the Parent Zone does for real ones.
  const { data: kids } = await db.from("students").select("id").eq("parent_id", parentId);
  const { data: consented } = await db.from("consent_log").select("student_id").eq("parent_id", parentId);
  const done = new Set((consented ?? []).map((c) => c.student_id));
  const missing = (kids ?? []).filter((k) => !done.has(k.id));
  if (missing.length) {
    check(
      "demo consent",
      await db.from("consent_log").insert(
        missing.map((k) => ({ parent_id: parentId, student_id: k.id, action: "given", version: CONSENT_VERSION, method: "seed" })),
      ),
    );
  }
  console.log(`✓ demo admin ${DEMO_ADMIN.email}, demo parent ${DEMO_PARENT.email} (child PIN ${DEMO_PIN})`);
  return parentId;
}

async function seedBilling(demoParentId: string) {
  const plan = check<{ id: string }>(
    "plan",
    await db
      .from("plans")
      .upsert(
        {
          slug: "annual",
          name: "Offbook year",
          description: "Everything Offbook has, for one child, for 12 months.",
          price_paise: 600000,
          tax_rate: 18,
          tax_inclusive: true,
          duration_days: 365,
          features: [
            "Every course in your child's level, unlocked one at a time",
            "Games, weekly challenges and leagues",
            "Projects and a portfolio you control",
            "Monthly online mentor sessions",
            "Weekly progress summary for parents",
          ],
          active: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single(),
  );

  check(
    "coupons",
    await db
      .from("coupons")
      .upsert({ code: "WELCOME10", kind: "percent", value: 10, note: "Demo coupon" }, { onConflict: "code" }),
  );
  check(
    "demo school",
    await db.from("schools").upsert(
      { name: "Demo Public School", city: "New Delhi", state: "Delhi", board: "CBSE", school_code: "DEMO2026", discount_percent: 20 },
      { onConflict: "school_code" },
    ),
  );

  // Policies: insert only, so HQ edits are never overwritten by a re-seed.
  check("policies", await db.from("policies").upsert(POLICIES, { onConflict: "slug", ignoreDuplicates: true }));

  // Give the demo children an active year so Play works straight away.
  const { data: kids } = await db
    .from("students")
    .select("id, display_name")
    .eq("parent_id", demoParentId)
    .in("display_name", DEMO_CHILDREN.map((c) => c.name));
  for (const kid of kids ?? []) {
    const { data: active } = await db.rpc("has_active_subscription", { p_student_id: kid.id });
    if (active) continue;
    const orderId = `demo_${kid.id}`;
    await db.from("subscriptions").delete().eq("razorpay_order_id", orderId).eq("status", "pending");
    check(
      `subscription ${kid.display_name}`,
      await db.from("subscriptions").insert({
        student_id: kid.id,
        parent_id: demoParentId,
        plan_id: plan.id,
        amount_paise: 600000,
        list_price_paise: 600000,
        razorpay_order_id: orderId,
      }),
    );
    check("activate", await db.rpc("activate_subscription", { p_order_id: orderId, p_payment_id: `demo_pay_${kid.id}` }));
  }
  console.log("✓ annual plan ₹6,000, coupon WELCOME10, school code DEMO2026 (20%), 4 policy pages, demo plans active");
}

// set_student_pin checks auth.uid(), which the service role lacks, so hash in SQL directly.
async function setPin(client: SupabaseClient, studentId: string, pin: string) {
  check(
    "pin",
    await client.rpc("seed_set_student_pin", { p_student_id: studentId, p_pin: pin }),
  );
}

async function reset() {
  for (const email of [DEMO_PARENT.email, DEMO_ADMIN.email]) {
    const id = await findUserId(email);
    if (id) await db.auth.admin.deleteUser(id);
  }
  for (const table of ["games", "courses", "course_slots", "tracks"]) {
    check(`clear ${table}`, await db.from(table).delete().not("id", "is", null));
  }
  console.log("✓ reset demo accounts and content");
}

async function main() {
  if (process.argv.includes("--reset")) await reset();
  await seedCurriculum();
  await seedContent(db);
  const demoParentId = await seedDemoAccounts();
  await seedBilling(demoParentId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
