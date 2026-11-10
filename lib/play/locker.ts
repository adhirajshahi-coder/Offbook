import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * The Locker (PRD §7.8, §7.10): coins come from XP (1 coin per 10 XP) and buy
 * cosmetics for Kube. Nothing here affects learning or access, and there's
 * no real money involved, ever.
 */

export const XP_PER_COIN = 10;

export type LockerItem = { id: string; slug: string; name: string; kind: "accessory" | "color"; asset: string; price: number; minLevel: number; owned: boolean; equipped: boolean };
export type Equipped = { accessory?: string; color?: string };
export type KubeLook = { accessory: string | null; color: string | null };

export function coinsEarned(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_COIN);
}

export async function coinsSpent(studentId: string): Promise<number> {
  const { data } = await createAdminClient().from("student_items").select("price_paid").eq("student_id", studentId);
  return (data ?? []).reduce((n, r) => n + r.price_paid, 0);
}

export async function loadLocker(student: { id: string; xp: number; level: number }) {
  const db = createAdminClient();
  const [{ data: items }, { data: owned }, { data: s }] = await Promise.all([
    db.from("locker_items").select("id, slug, name, kind, asset, price_coins, min_level").eq("status", "published").order("order_index"),
    db.from("student_items").select("item_id, price_paid").eq("student_id", student.id),
    db.from("students").select("equipped").eq("id", student.id).single(),
  ]);
  const equipped = (s?.equipped ?? {}) as Equipped;
  const ownedIds = new Set((owned ?? []).map((o) => o.item_id));
  const spent = (owned ?? []).reduce((n, o) => n + o.price_paid, 0);
  return {
    coins: coinsEarned(student.xp) - spent,
    equipped,
    items: (items ?? []).map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      kind: i.kind as LockerItem["kind"],
      asset: i.asset,
      price: i.price_coins,
      minLevel: i.min_level,
      owned: ownedIds.has(i.id),
      equipped: equipped[i.kind as keyof Equipped] === i.slug,
    })) as LockerItem[],
  };
}

/** What Kube is wearing, as renderer assets, for any screen that shows the student's Kube. */
export async function kubeLook(studentId: string): Promise<KubeLook> {
  const db = createAdminClient();
  const { data: s } = await db.from("students").select("equipped").eq("id", studentId).single();
  const eq = (s?.equipped ?? {}) as Equipped;
  const slugs = [eq.accessory, eq.color].filter(Boolean) as string[];
  if (!slugs.length) return { accessory: null, color: null };
  const { data } = await db.from("locker_items").select("slug, kind, asset").in("slug", slugs);
  const find = (kind: string) => data?.find((d) => d.kind === kind)?.asset ?? null;
  return { accessory: find("accessory"), color: find("color") };
}
