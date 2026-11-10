"use server";

import { revalidatePath } from "next/cache";
import { loadLocker } from "@/lib/play/locker";
import { studentOrThrow } from "@/lib/play/session";
import { createAdminClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

/** Buy a cosmetic with coins. The balance and level are re-checked on the server. */
export async function buyItem(slug: string): Promise<Result> {
  const student = await studentOrThrow();
  const locker = await loadLocker(student);
  const item = locker.items.find((i) => i.slug === slug);
  if (!item) return { ok: false, error: "That item isn't in the Locker." };
  if (item.owned) return { ok: true };
  if (student.level < item.minLevel) return { ok: false, error: `Reach level ${item.minLevel} to unlock this.` };
  if (locker.coins < item.price) return { ok: false, error: `You need ${item.price - locker.coins} more coins.` };
  const db = createAdminClient();
  const { error } = await db.from("student_items").insert({ student_id: student.id, item_id: item.id, price_paid: item.price });
  if (error && error.code !== "23505") return { ok: false, error: "That didn't go through. Try again." };
  await equip(student.id, item.kind, item.slug);
  revalidatePath("/play/me");
  return { ok: true };
}

/** Wear (or take off) an owned item. */
export async function equipItem(kind: "accessory" | "color", slug: string | null): Promise<Result> {
  const student = await studentOrThrow();
  if (slug) {
    const locker = await loadLocker(student);
    if (!locker.items.some((i) => i.slug === slug && i.kind === kind && i.owned)) return { ok: false, error: "Buy it first." };
  }
  await equip(student.id, kind, slug);
  revalidatePath("/play/me");
  return { ok: true };
}

async function equip(studentId: string, kind: string, slug: string | null) {
  const db = createAdminClient();
  const { data } = await db.from("students").select("equipped").eq("id", studentId).single();
  const next = { ...((data?.equipped ?? {}) as Record<string, string>) };
  if (slug) next[kind] = slug;
  else delete next[kind];
  await db.from("students").update({ equipped: next }).eq("id", studentId);
}
