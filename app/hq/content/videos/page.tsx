import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { isMuxConfigured } from "@/lib/mux";
import { createClient } from "@/lib/supabase/server";
import { Uploader } from "./Uploader";
import { VideosTable } from "./VideosTable";

export const metadata: Metadata = { title: "Videos" };

export default async function VideosPage() {
  const staff = await requireStaff(["content", "teacher"]);
  const supabase = await createClient();
  // Teachers only see their own videos (RLS).
  const [{ data: videos }, { data: tracks }] = await Promise.all([
    supabase.from("videos").select("id, title, teacher, status, duration_sec, created_at, error_message, tracks(zone_name)").order("created_at", { ascending: false }),
    supabase.from("tracks").select("id, zone_name, order_index").order("order_index"),
  ]);

  return (
    <div className="max-w-6xl space-y-4">
      <PageHeader
        title="Videos"
        crumbs={[{ href: "/hq/content", label: "Content" }]}
        description={staff.role === "teacher" ? "Your uploaded videos." : "Teacher videos. Upload here, then attach them to lesson steps."}
      />
      <Card title="Upload video">
        <Uploader configured={isMuxConfigured()} tracks={(tracks ?? []).map((t) => ({ id: t.id, zone: t.zone_name }))} />
      </Card>
      <VideosTable
        rows={(videos ?? []).map((v) => ({
          id: v.id,
          title: v.title,
          teacher: v.teacher ?? "",
          zone: (v.tracks as unknown as { zone_name: string } | null)?.zone_name ?? "",
          status: v.status,
          duration: v.duration_sec ?? 0,
          created: v.created_at.slice(0, 10),
          error: v.error_message ?? "",
        }))}
      />
    </div>
  );
}
