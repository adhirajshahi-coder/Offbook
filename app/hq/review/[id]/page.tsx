import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { CANNED_FEEDBACK, CAPSTONE_RUBRIC, SLA_HOURS } from "@/lib/hq/review";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { DecisionPanel } from "./DecisionPanel";

export const metadata: Metadata = { title: "Review" };

type Sub = {
  id: string;
  kind: "make" | "capstone" | "challenge";
  status: string;
  content: { text?: string; link?: string | null } | null;
  feedback: string | null;
  rubric_checks: boolean[];
  created_at: string;
  reviewed_at: string | null;
  assigned_to: string | null;
  reviewer_id: string | null;
  student_id: string;
  students: { display_name: string; class_grade: number; band: string } | null;
  courses: { title: string; capstone: { brief?: string } | null } | null;
  challenges: { title: string; brief: string; rubric: string[] } | null;
  lesson_steps: { content: { prompt?: string } | null } | null;
};

export default async function ReviewItemPage({ params }: PageProps<"/hq/review/[id]">) {
  const staff = await requireStaff(["reviewer", "ops"]);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select(
      "id, kind, status, content, feedback, rubric_checks, created_at, reviewed_at, assigned_to, reviewer_id, student_id, students(display_name, class_grade, band), courses(title, capstone), challenges(title, brief, rubric), lesson_steps(content)",
    )
    .eq("id", id)
    .maybeSingle();
  const sub = data as unknown as Sub | null;
  if (!sub) notFound();

  const [{ data: team }, { count: earlier }] = await Promise.all([
    createAdminClient().from("staff").select("id, name").in("id", [sub.assigned_to, sub.reviewer_id].filter(Boolean) as string[]),
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("student_id", sub.student_id).neq("id", sub.id).in("status", ["approved", "revision", "rejected"]),
  ]);
  const who = new Map((team ?? []).map((s) => [s.id, s.name]));

  const title = sub.challenges?.title ?? sub.courses?.title ?? "Submission";
  const brief = sub.kind === "challenge" ? sub.challenges?.brief : sub.kind === "capstone" ? sub.courses?.capstone?.brief : sub.lesson_steps?.content?.prompt;
  const rubric = sub.kind === "challenge" ? (sub.challenges?.rubric ?? []) : sub.kind === "capstone" ? CAPSTONE_RUBRIC : ["Answers the prompt", "In their own words"];
  const hours = Math.floor((new Date().getTime() - new Date(sub.created_at).getTime()) / 3_600_000);
  const open = sub.status === "pending" || sub.status === "kept";

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={title}
        crumbs={[{ href: "/hq/review", label: "Review queue" }]}
        description={`${sub.kind === "make" ? "Make step (sample)" : sub.kind === "capstone" ? "Capstone" : "Challenge"} · ${sub.students?.display_name}, Class ${sub.students?.class_grade} · submitted ${hours < 1 ? "under an hour" : `${hours} h`} ago${open && sub.kind !== "make" ? ` (target ${SLA_HOURS} h)` : ""}`}
        actions={<StatusBadge status={sub.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {brief && (
            <Card title="Brief">
              <p className="whitespace-pre-line text-sm">{brief}</p>
            </Card>
          )}
          <Card title="Student's work">
            <p className="whitespace-pre-line text-sm leading-relaxed">{sub.content?.text}</p>
            {sub.content?.link && (
              <p className="mt-3 text-sm">
                Link:{" "}
                <a href={sub.content.link} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-violet-700 underline">
                  {sub.content.link}
                </a>
                <span className="block text-xs text-[#6b6778]">Opens an outside site. Check it&apos;s safe before sharing anywhere.</span>
              </p>
            )}
          </Card>
          <p className="text-xs text-[#6b6778]">
            {earlier ? `${earlier} earlier reviewed ${earlier === 1 ? "submission" : "submissions"} from this student.` : "First reviewed submission from this student."}
          </p>
        </div>
        <DecisionPanel
          id={sub.id}
          open={open}
          rubric={rubric}
          initialChecks={sub.rubric_checks}
          feedback={sub.feedback}
          canned={CANNED_FEEDBACK}
          assigned={sub.assigned_to ? (sub.assigned_to === staff.id ? "you" : (who.get(sub.assigned_to) ?? "someone else")) : null}
          reviewedBy={sub.reviewer_id ? (who.get(sub.reviewer_id) ?? "a reviewer") : null}
          kind={sub.kind}
        />
      </div>
    </div>
  );
}
