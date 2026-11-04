import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { formatDate, getChildren } from "@/lib/parent-data";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_LABEL } from "@/lib/portfolio";
import { ChallengeRequest } from "./ChallengeRequest";
import { LeagueToggle } from "./LeagueToggle";
import { SharingControls } from "./SharingControls";

export const metadata: Metadata = { title: "Activity and sharing" };

type PermissionRow = {
  student_id: string;
  challenge_id: string;
  requested_at: string;
  granted_at: string | null;
  challenges: { title: string; brief: string; safety_note: string } | null;
};

export default async function ActivityPage() {
  await requireParent();
  const supabase = await createClient();
  const [children, { data: perms }, { data: handles }, { data: items }] = await Promise.all([
    getChildren(),
    supabase
      .from("challenge_permissions")
      .select("student_id, challenge_id, requested_at, granted_at, challenges(title, brief, safety_note)")
      .order("requested_at", { ascending: false }),
    supabase.from("students").select("id, portfolio_handle, league_opt_in").is("deleted_at", null),
    supabase.from("portfolio_items").select("id, student_id, source_type, title, visibility, showcase_consent, showcase_status").order("created_at", { ascending: false }),
  ]);
  const handleOf = new Map((handles ?? []).map((h) => [h.id, h.portfolio_handle as string | null]));
  const leagueOn = new Map((handles ?? []).map((h) => [h.id, Boolean(h.league_opt_in)]));
  const name = new Map(children.map((c) => [c.id, c.display_name]));
  const rows = (perms ?? []) as unknown as PermissionRow[];
  const waiting = rows.filter((r) => !r.granted_at);
  const granted = rows.filter((r) => r.granted_at);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black">Activity and sharing</h1>
        <p className="mt-1 text-muted">Okay real-world challenges and choose what your children share.</p>
      </header>

      <section>
        <h2 className="text-xl font-black">Challenge requests</h2>
        <p className="mt-1 text-sm text-muted">
          Challenges happen offline, so your child needs your okay first. Read the safety note, then allow it. Children submit text or a link, never photos.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {waiting.map((r) => (
            <li key={`${r.student_id}-${r.challenge_id}`}>
              <ChallengeRequest
                studentId={r.student_id}
                challengeId={r.challenge_id}
                childName={name.get(r.student_id) ?? "Your child"}
                title={r.challenges?.title ?? "Challenge"}
                brief={r.challenges?.brief ?? ""}
                safetyNote={r.challenges?.safety_note ?? ""}
                requestedOn={formatDate(r.requested_at)}
              />
            </li>
          ))}
          {waiting.length === 0 && <li className="rounded-[14px] border border-dashed border-line bg-white p-5 text-muted">No requests waiting.</li>}
        </ul>
        {granted.length > 0 && (
          <>
            <h3 className="mt-6 font-bold">Allowed</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {granted.map((r) => (
                <li key={`${r.student_id}-${r.challenge_id}`}>
                  <ChallengeRequest
                    studentId={r.student_id}
                    challengeId={r.challenge_id}
                    childName={name.get(r.student_id) ?? "Your child"}
                    title={r.challenges?.title ?? "Challenge"}
                    grantedOn={formatDate(r.granted_at!)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2 className="text-xl font-black">Weekly leagues</h2>
        <p className="mt-1 text-sm text-muted">Off by default. A friendly weekly race for XP; top learners move up a league.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {children.map((c) => (
            <li key={c.id}>
              <LeagueToggle studentId={c.id} childName={c.display_name} on={leagueOn.get(c.id) ?? false} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-black">Portfolio and Showcase</h2>
        <p className="mt-1 text-sm text-muted">
          Everything is private unless you share it. A public portfolio needs a link and items you tick. The Offbook Showcase needs your okay and a check by our team.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {children.map((c) => (
            <li key={c.id}>
              <SharingControls
                studentId={c.id}
                childName={c.display_name}
                handle={handleOf.get(c.id) ?? null}
                items={(items ?? [])
                  .filter((i) => i.student_id === c.id)
                  .map((i) => ({ ...i, source: SOURCE_LABEL[i.source_type as keyof typeof SOURCE_LABEL] }))}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
