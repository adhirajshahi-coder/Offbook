import type { Metadata } from "next";
import { Card, PageHeader, hqButton } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createGroup } from "../actions";

export const metadata: Metadata = { title: "New question group" };

export default async function NewGroupPage({ searchParams }: PageProps<"/hq/content/questions/new">) {
  await requireStaff(["content"]);
  const sp = await searchParams;
  const lesson = typeof sp.lesson === "string" ? sp.lesson : null;
  const mission = typeof sp.mission === "string" ? sp.mission : null;
  const supabase = await createClient();
  const { data: l } = lesson ? await supabase.from("lessons").select("title").eq("id", lesson).maybeSingle() : { data: null };
  const { data: m } = mission ? await supabase.from("missions").select("title").eq("id", mission).maybeSingle() : { data: null };

  return (
    <div className="max-w-xl">
      <PageHeader title="New question group" crumbs={[{ href: "/hq/content/questions", label: "Questions" }]} />
      <Card>
        {l || m ? (
          <form action={createGroup} className="space-y-3">
            {lesson && <input type="hidden" name="lesson" value={lesson} />}
            {mission && <input type="hidden" name="mission" value={mission} />}
            <p className="text-sm">
              {l ? (
                <>
                  For the lesson <strong>{l.title}</strong>. Attach it to a Try step in the lesson editor once it&apos;s published.
                </>
              ) : (
                <>
                  A boss question for <strong>{m!.title}</strong>.
                </>
              )}
            </p>
            <button className={hqButton("primary")}>Create and edit</button>
          </form>
        ) : (
          <p className="text-sm">Open a lesson (or a mission, for boss questions) and start a new group from there.</p>
        )}
      </Card>
    </div>
  );
}
