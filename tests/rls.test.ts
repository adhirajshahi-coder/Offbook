/**
 * Row Level Security checks against the real Supabase project.
 * Runs only when .env.local has Supabase keys: `npm run test:db`.
 * Creates two throwaway parent accounts and deletes them afterwards.
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const enabled = Boolean(url && anonKey && secret && process.env.RUN_DB_TESTS === "1");

describe.skipIf(!enabled)("RLS", () => {
  const admin = enabled ? createClient(url!, secret!, { auth: { persistSession: false } }) : null!;
  const created: string[] = [];
  let parentA: SupabaseClient;
  let parentB: SupabaseClient;
  let parentAId: string;
  let childOfA: string;

  async function signedInParent(tag: string, kind: "parent" | "staff" = "parent") {
    const email = `rls-${tag}-${Date.now()}@test.offbook.test`;
    const { data: user, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { kind, name: `RLS ${tag}` },
    });
    if (error) throw error;
    created.push(user.user.id);
    const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const { error: verifyError } = await client.auth.verifyOtp({
      token_hash: link.properties!.hashed_token,
      type: "magiclink",
    });
    if (verifyError) throw verifyError;
    return { client, id: user.user.id };
  }

  beforeAll(async () => {
    const a = await signedInParent("a");
    const b = await signedInParent("b");
    parentA = a.client;
    parentAId = a.id;
    parentB = b.client;

    const { data, error } = await parentA
      .from("students")
      .insert({ parent_id: a.id, display_name: "Tara", class_grade: 7, content_level: 1 })
      .select("id")
      .single();
    if (error) throw error;
    childOfA = data.id;
  });

  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id);
  });

  it("lets a parent read their own child", async () => {
    const { data } = await parentA.from("students").select("id").eq("id", childOfA);
    expect(data).toHaveLength(1);
  });

  it("hides one parent's child from another parent", async () => {
    const { data } = await parentB.from("students").select("id").eq("id", childOfA);
    expect(data).toHaveLength(0);
  });

  it("blocks adding a child under someone else's account", async () => {
    const { error } = await parentB
      .from("students")
      .insert({ parent_id: parentAId, display_name: "Fake", class_grade: 8, content_level: 1 });
    expect(error).not.toBeNull();
  });

  it("blocks editing another parent's child", async () => {
    const { data } = await parentB
      .from("students")
      .update({ display_name: "Hacked" })
      .eq("id", childOfA)
      .select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("stops parents changing progress fields directly", async () => {
    const { error } = await parentA.from("students").update({ xp: 99999 }).eq("id", childOfA);
    expect(error).not.toBeNull();
  });

  it("never exposes PIN hashes", async () => {
    await parentA.rpc("set_student_pin", { p_student_id: childOfA, p_pin: "4321" });
    const { data } = await parentA.from("student_pins").select("*");
    expect(data ?? []).toHaveLength(0);
  });

  it("verifies the PIN only for the child's own parent", async () => {
    const ok = await parentA.rpc("verify_student_pin", { p_student_id: childOfA, p_pin: "4321" });
    expect(ok.data).toBe("ok");
    const other = await parentB.rpc("verify_student_pin", { p_student_id: childOfA, p_pin: "4321" });
    expect(other.error).not.toBeNull();
  });

  describe("billing", () => {
    let subId: string;

    beforeAll(async () => {
      const { data: plan } = await admin.from("plans").select("id").eq("slug", "annual").single();
      const { data } = await admin
        .from("subscriptions")
        .insert({
          student_id: childOfA,
          parent_id: parentAId,
          plan_id: plan!.id,
          amount_paise: 600000,
          list_price_paise: 600000,
          razorpay_order_id: `rls_${Date.now()}`,
        })
        .select("id")
        .single();
      subId = data!.id;
    });

    it("shows a parent their own subscription but not another parent's", async () => {
      expect((await parentA.from("subscriptions").select("id").eq("id", subId)).data).toHaveLength(1);
      expect((await parentB.from("subscriptions").select("id").eq("id", subId)).data).toHaveLength(0);
    });

    it("won't let a parent activate a plan without paying", async () => {
      const { error } = await parentA.from("subscriptions").update({ status: "active" }).eq("id", subId);
      expect(error).not.toBeNull();
    });

    it("blocks parents from inserting subscriptions or invoices", async () => {
      const sub = await parentA.from("subscriptions").insert({
        student_id: childOfA, parent_id: parentAId, plan_id: subId, amount_paise: 0, list_price_paise: 0,
      });
      expect(sub.error).not.toBeNull();
      const inv = await parentA.rpc("activate_subscription", { p_order_id: "x", p_payment_id: "y" });
      expect(inv.error).not.toBeNull();
    });

    it("lets visitors read the plan but never coupons or leads", async () => {
      const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
      expect((await anon.from("plans").select("slug").eq("slug", "annual")).data).toHaveLength(1);
      expect((await anon.from("coupons").select("code")).data ?? []).toHaveLength(0);
      expect((await parentA.from("coupons").select("code")).data ?? []).toHaveLength(0);
      expect((await parentA.from("lead_submissions").select("id")).data ?? []).toHaveLength(0);
    });
  });

  describe("progress", () => {
    beforeAll(async () => {
      await admin.from("xp_events").insert({ student_id: childOfA, source_type: "test", source_id: "rls", amount: 10 });
    });

    it("lets a parent read their child's XP but not another child's", async () => {
      expect((await parentA.from("xp_events").select("amount").eq("student_id", childOfA)).data).toHaveLength(1);
      expect((await parentB.from("xp_events").select("amount").eq("student_id", childOfA)).data ?? []).toHaveLength(0);
    });

    it("never lets a parent write progress or XP directly", async () => {
      const xp = await parentA.from("xp_events").insert({ student_id: childOfA, source_type: "cheat", source_id: "x", amount: 9999 });
      expect(xp.error).not.toBeNull();
      const { data: course } = await admin.from("courses").select("id").eq("slug", "money-skills").single();
      const cp = await parentA.from("course_progress").insert({ student_id: childOfA, course_id: course!.id, status: "completed" });
      expect(cp.error).not.toBeNull();
    });

    it("keeps lesson content and answers away from families", async () => {
      expect((await parentA.from("questions").select("answer")).data ?? []).toHaveLength(0);
      expect((await parentA.from("lesson_steps").select("id")).data ?? []).toHaveLength(0);
    });
  });

  describe("staff roles", () => {
    async function staffAs(role: string) {
      const u = await signedInParent(`staff-${role}`, "staff");
      await admin.from("staff").insert({ id: u.id, name: `RLS ${role}`, role, active: true });
      return u;
    }

    it("lets the content team edit lessons, but not viewers or parents", async () => {
      const content = await staffAs("content");
      const viewer = await staffAs("viewer");
      const { data: lesson } = await admin.from("lessons").select("id, summary").limit(1).single();
      const ok = await content.client.from("lessons").update({ summary: lesson!.summary }).eq("id", lesson!.id).select("id");
      expect(ok.data).toHaveLength(1);
      const no = await viewer.client.from("lessons").update({ summary: "hacked" }).eq("id", lesson!.id).select("id");
      expect(no.data ?? []).toHaveLength(0);
      const parent = await parentA.from("lessons").update({ summary: "hacked" }).eq("id", lesson!.id).select("id");
      expect(parent.data ?? []).toHaveLength(0);
    });

    it("keeps teachers to their own videos", async () => {
      const t1 = await staffAs("teacher");
      const t2 = await staffAs("teacher");
      const mine = await t1.client.from("videos").insert({ title: "RLS test clip", uploaded_by: t1.id, status: "uploading" }).select("id").single();
      expect(mine.error).toBeNull();
      expect((await t2.client.from("videos").select("id").eq("id", mine.data!.id)).data ?? []).toHaveLength(0);
      const forged = await t2.client.from("videos").insert({ title: "Forged", uploaded_by: t1.id, status: "uploading" });
      expect(forged.error).not.toBeNull();
      await admin.from("videos").delete().eq("id", mine.data!.id);
    });

    it("lets ops grant a course and read the audit trail only as admin", async () => {
      const ops = await staffAs("ops");
      const { data: course } = await admin.from("courses").select("id").eq("slug", "critical-thinking").single();
      const grant = await ops.client.from("course_overrides").insert({ student_id: childOfA, course_id: course!.id, action: "unlock", reason: "RLS test", created_by: ops.id });
      expect(grant.error).toBeNull();
      await ops.client.rpc("write_audit", { p_action: "test.rls", p_target_type: "student", p_target_id: childOfA, p_details: {} });
      expect((await ops.client.from("audit_log").select("id").eq("action", "test.rls")).data ?? []).toHaveLength(0);
      await admin.from("audit_log").delete().eq("action", "test.rls");
    });
  });

  describe("games, challenges and portfolio", () => {
    let challengeId: string;
    let itemId: string;

    beforeAll(async () => {
      const { data: ch } = await admin.from("challenges").select("id").eq("status", "published").limit(1).single();
      challengeId = ch!.id;
      await admin.from("challenge_permissions").insert({ student_id: childOfA, challenge_id: challengeId });
      const { data: item } = await admin
        .from("portfolio_items")
        .insert({ student_id: childOfA, source_type: "challenge", source_id: challengeId, title: "RLS item" })
        .select("id")
        .single();
      itemId = item!.id;
    });

    it("lets only the child's own parent grant a challenge", async () => {
      const other = await parentB.from("challenge_permissions").update({ granted_at: new Date().toISOString() }).eq("student_id", childOfA).select("student_id");
      expect(other.data ?? []).toHaveLength(0);
      const own = await parentA.from("challenge_permissions").update({ granted_at: new Date().toISOString(), granted_by: parentAId }).eq("student_id", childOfA).select("student_id");
      expect(own.data).toHaveLength(1);
    });

    it("never lets families write game sessions, submissions or certificates", async () => {
      const { data: game } = await admin.from("games").select("id").limit(1).single();
      expect((await parentA.from("game_sessions").insert({ student_id: childOfA, game_id: game!.id, seed: 1 })).error).not.toBeNull();
      expect((await parentA.from("submissions").insert({ student_id: childOfA, kind: "challenge", content: {} })).error).not.toBeNull();
      expect((await parentA.from("certificates").insert({ code: "OB-RLSX-TEST", student_id: childOfA, title: "x", course_id: null, mission_id: null })).error).not.toBeNull();
    });

    it("lets a parent share an item but not approve it for the Showcase", async () => {
      const share = await parentA.from("portfolio_items").update({ visibility: "portfolio", showcase_consent: true }).eq("id", itemId).select("showcase_status").single();
      expect(share.data?.showcase_status).toBe("pending");
      const approve = await parentA.from("portfolio_items").update({ showcase_status: "approved" }).eq("id", itemId);
      expect(approve.error).not.toBeNull();
      const retitle = await parentA.from("portfolio_items").update({ title: "Changed" }).eq("id", itemId);
      expect(retitle.error).not.toBeNull();
      expect((await parentB.from("portfolio_items").select("id").eq("id", itemId)).data ?? []).toHaveLength(0);
    });

    it("lets a reviewer approve a consented Showcase item, and keeps leagues closed to families", async () => {
      const u = await signedInParent("staff-reviewer", "staff");
      await admin.from("staff").insert({ id: u.id, name: "RLS reviewer", role: "reviewer", active: true });
      const ok = await u.client.from("portfolio_items").update({ showcase_status: "approved" }).eq("id", itemId).select("id");
      expect(ok.data).toHaveLength(1);
      expect((await parentA.from("leagues").select("id")).data ?? []).toHaveLength(0);
    });
  });

  it("keeps the staff table and HQ content closed to parents", async () => {
    const staff = await parentA.from("staff").select("*");
    expect(staff.data ?? []).toHaveLength(0);
    const lessons = await parentA.from("lessons").select("*");
    expect(lessons.data ?? []).toHaveLength(0);
  });
});
