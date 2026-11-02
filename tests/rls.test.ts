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

  async function signedInParent(tag: string) {
    const email = `rls-${tag}-${Date.now()}@test.offbook.test`;
    const { data: user, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { kind: "parent", name: `RLS ${tag}` },
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

  it("keeps the staff table and HQ content closed to parents", async () => {
    const staff = await parentA.from("staff").select("*");
    expect(staff.data ?? []).toHaveLength(0);
    const lessons = await parentA.from("lessons").select("*");
    expect(lessons.data ?? []).toHaveLength(0);
  });
});
