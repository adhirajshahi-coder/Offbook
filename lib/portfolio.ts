import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Portfolio, certificates and Showcase (PRD §7.9, §13). Public pages read
 * through the service role and filter here: nothing is public unless the
 * parent turned it on, and Showcase also needs staff approval. Public views
 * show a first name and band only.
 */

export type PortfolioItem = {
  id: string;
  source_type: "mission" | "capstone" | "challenge";
  title: string;
  summary: string;
  skills: string[];
  visibility: "private" | "portfolio";
  showcase_consent: boolean;
  showcase_status: "none" | "pending" | "approved" | "rejected";
  created_at: string;
};

export type Certificate = { code: string; title: string; issued_at: string };

const ITEM_COLUMNS = "id, source_type, title, summary, skills, visibility, showcase_consent, showcase_status, created_at";

export const SOURCE_LABEL: Record<PortfolioItem["source_type"], string> = { mission: "Mission", capstone: "Capstone project", challenge: "Real-world challenge" };

export async function loadPortfolio(studentId: string): Promise<{ items: PortfolioItem[]; certificates: Certificate[] }> {
  const db = createAdminClient();
  const [items, certs] = await Promise.all([
    db.from("portfolio_items").select(ITEM_COLUMNS).eq("student_id", studentId).order("created_at", { ascending: false }),
    db.from("certificates").select("code, title, issued_at").eq("student_id", studentId).order("issued_at", { ascending: false }),
  ]);
  return { items: (items.data ?? []) as PortfolioItem[], certificates: (certs.data ?? []) as Certificate[] };
}

export type PublicProfile = { name: string; band: string; rank: string; items: PortfolioItem[]; certificates: Certificate[] };

/** /p/[handle]: only children whose parent set a handle, only items the parent made visible. */
export async function publicPortfolio(handle: string): Promise<PublicProfile | null> {
  if (!/^[a-z0-9-]{3,30}$/.test(handle)) return null;
  const db = createAdminClient();
  const { data: s } = await db.from("students").select("id, display_name, band, rank, status, deleted_at, public_portfolio").eq("portfolio_handle", handle).maybeSingle();
  if (!s || s.deleted_at || s.status !== "active" || !s.public_portfolio) return null;
  const [items, certs] = await Promise.all([
    db.from("portfolio_items").select(ITEM_COLUMNS).eq("student_id", s.id).eq("visibility", "portfolio").order("created_at", { ascending: false }),
    db.from("certificates").select("code, title, issued_at").eq("student_id", s.id).order("issued_at", { ascending: false }),
  ]);
  return {
    name: s.display_name,
    band: s.band,
    rank: s.rank,
    items: (items.data ?? []) as PortfolioItem[],
    certificates: (certs.data ?? []) as Certificate[],
  };
}

export type CertificateView = Certificate & { name: string; kind: "course" | "mission" };

export async function certificateByCode(code: string): Promise<CertificateView | null> {
  if (!/^OB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return null;
  const db = createAdminClient();
  const { data } = await db.from("certificates").select("code, title, issued_at, course_id, students(display_name, deleted_at)").eq("code", code).maybeSingle();
  const student = data?.students as unknown as { display_name: string; deleted_at: string | null } | null;
  if (!data || !student || student.deleted_at) return null;
  return { code: data.code, title: data.title, issued_at: data.issued_at, name: student.display_name, kind: data.course_id ? "course" : "mission" };
}

export type ShowcaseCard = { id: string; title: string; summary: string; source_type: PortfolioItem["source_type"]; name: string; band: string };

/** Public Showcase wall: parent consent AND staff approval. */
export async function showcaseItems(limit = 30): Promise<ShowcaseCard[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("portfolio_items")
    .select("id, title, summary, source_type, created_at, students!inner(display_name, band, status, deleted_at)")
    .eq("showcase_status", "approved")
    .eq("showcase_consent", true)
    .eq("students.status", "active")
    .is("students.deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const s = r.students as unknown as { display_name: string; band: string };
    return { id: r.id, title: r.title, summary: r.summary, source_type: r.source_type as PortfolioItem["source_type"], name: s.display_name, band: s.band };
  });
}
