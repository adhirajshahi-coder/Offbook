import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChallengeForm, type ChallengeValues } from "./ChallengeForm";

export const metadata: Metadata = { title: "Challenge" };

const BLANK: ChallengeValues = {
  title: "",
  type: "real_world",
  brief: "",
  safety_note: "Do this with a parent or guardian. Don't share your address, phone number or photos of people online.",
  rubric: "",
  xp: 200,
  track_id: "",
  required_course_id: "",
  band: "",
  starts_at: "",
  ends_at: "",
  parent_ack_required: true,
  status: "draft",
};

/** datetime-local value in IST for a stored timestamp. */
function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

export default async function ChallengeEditPage({ params }: PageProps<"/hq/content/challenges/[id]">) {
  await requireStaff(["content"]);
  const { id } = await params;
  const isNew = id === "new";
  const supabase = await createClient();
  const [{ data: tracks }, { data: courses }, { data: c }] = await Promise.all([
    supabase.from("tracks").select("id, zone_name").order("order_index"),
    supabase.from("courses").select("id, title, level").order("level").order("title"),
    isNew ? Promise.resolve({ data: null }) : supabase.from("challenges").select("*").eq("id", id).maybeSingle(),
  ]);
  if (!isNew && !c) notFound();

  const values: ChallengeValues = c
    ? {
        title: c.title,
        type: c.type,
        brief: c.brief,
        safety_note: c.safety_note,
        rubric: (Array.isArray(c.rubric) ? (c.rubric as string[]) : []).join("\n"),
        xp: c.xp,
        track_id: c.track_id ?? "",
        required_course_id: c.required_course_id ?? "",
        band: c.band ?? "",
        starts_at: toLocal(c.starts_at),
        ends_at: toLocal(c.ends_at),
        parent_ack_required: c.parent_ack_required,
        status: c.status,
      }
    : BLANK;

  return (
    <div className="max-w-4xl">
      <PageHeader title={isNew ? "New challenge" : c!.title} crumbs={[{ href: "/hq/content/challenges", label: "Challenges" }]} />
      <Card>
        <ChallengeForm id={isNew ? null : id} initial={values} tracks={tracks ?? []} courses={courses ?? []} />
      </Card>
    </div>
  );
}
