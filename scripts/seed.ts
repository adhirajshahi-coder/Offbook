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

  // Slots have no natural key, so replace them wholesale.
  check("clear slots", await db.from("course_slots").delete().not("id", "is", null));
  const slots = check(
    "slots",
    await db
      .from("course_slots")
      .insert(SLOTS.map((s) => ({ level: s.level, order_index: s.order, title: s.title })))
      .select("id, level, order_index"),
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
  console.log(`✓ demo admin ${DEMO_ADMIN.email}, demo parent ${DEMO_PARENT.email} (child PIN ${DEMO_PIN})`);
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
  await seedDemoAccounts();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
