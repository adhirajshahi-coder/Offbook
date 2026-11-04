import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/hq/forms";
import { Card, Empty, PageHeader } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { SOURCE_LABEL, type PortfolioItem } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";
import { moderateShowcase } from "../actions";

export const metadata: Metadata = { title: "Showcase moderation" };

type Row = {
  id: string;
  title: string;
  summary: string;
  source_type: PortfolioItem["source_type"];
  submission_id: string | null;
  created_at: string;
  students: { display_name: string; band: string } | null;
};

export default async function ShowcaseModerationPage() {
  await requireStaff(["reviewer", "ops"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select("id, title, summary, source_type, submission_id, created_at, students(display_name, band)")
    .eq("showcase_status", "pending")
    .eq("showcase_consent", true)
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Showcase moderation"
        crumbs={[{ href: "/hq/review", label: "Review queue" }]}
        description="Parents offered these for the public Showcase. Approve only work that's safe to share: no full names, faces, schools or contact details."
      />
      {rows.length === 0 ? (
        <Card>
          <Empty>Nothing waiting for the Showcase.</Empty>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <Card key={r.id} title={`${r.title} · ${SOURCE_LABEL[r.source_type]}`}>
              <p className="text-sm">{r.summary || "No summary."}</p>
              <p className="mt-2 text-xs text-[#6b6778]">
                Will show as: {r.students?.display_name} · {r.students?.band} band
                {r.submission_id && (
                  <>
                    {" · "}
                    <Link href={`/hq/review/${r.submission_id}`} className="text-violet-700 hover:underline">
                      Full submission
                    </Link>
                  </>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionButton variant="primary" onClick={moderateShowcase.bind(null, r.id, true)}>
                  Approve for Showcase
                </ActionButton>
                <ActionButton variant="secondary" onClick={moderateShowcase.bind(null, r.id, false)}>
                  Don&apos;t show
                </ActionButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
