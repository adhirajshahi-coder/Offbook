import type { Metadata } from "next";
import Link from "next/link";
import { Kube } from "@/components/kid/Kube";
import type { KubeStage } from "@/components/kid/kube-types";
import { MuteToggle } from "@/components/kid/MuteToggle";
import { WithTabs } from "@/components/kid/TabBar";
import { XpBar } from "@/components/kid/XpBar";
import { Button, buttonClass } from "@/components/ui/button";
import { getActiveStudent } from "@/lib/auth";
import { BAND_LABEL, type Band } from "@/lib/bands";
import { RANK_LABEL, rankIndex, type Rank } from "@/lib/gamification/xp";
import { coinsEarned, coinsSpent, kubeLook } from "@/lib/play/locker";
import type { Student } from "@/lib/play/session";
import { nextAction } from "@/lib/play/state";
import { loadStats } from "@/lib/play/stats";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { switchProfile } from "./actions";
import { ProfilePicker } from "./ProfilePicker";

export const metadata: Metadata = { title: "Play" };

export default async function PlayHome() {
  const student = await getActiveStudent();

  if (!student) {
    const supabase = await createClient();
    const { data: profiles } = await supabase
      .from("students")
      .select("id, display_name, class_grade")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("created_at");

    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {profiles && profiles.length > 0 ? (
          <ProfilePicker profiles={profiles} />
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <Kube expression="sleepy" size={96} />
            <h1 className="text-2xl font-black">No profiles yet</h1>
            <p className="text-muted">A parent adds your profile in the Parent Zone first.</p>
            <Link href="/parent" className={buttonClass("primary")}>
              Go to the Parent Zone
            </Link>
          </div>
        )}
      </main>
    );
  }

  return <Today student={student} />;
}

async function Today({ student }: { student: Student }) {
  const [action, stats] = await Promise.all([nextAction(student), loadStats(student.id, student.weekly_goal)]);
  const rank = student.rank as Rank;
  const view = action?.view;
  const next = action?.next ?? null;

  let continueHref: string | null = null;
  let continueLabel = "";
  if (view && next) {
    if (next.kind === "lesson") {
      const lesson = view.missions.flatMap((m, mi) => m.lessons.map((l, li) => ({ ...l, mi, li }))).find((l) => l.id === next.lessonId);
      continueHref = `/play/lesson/${next.lessonId}`;
      continueLabel = lesson ? `Mission ${lesson.mi + 1}, Lesson ${lesson.li + 1}: ${lesson.title}` : "Next lesson";
    } else if (next.kind === "quiz" || next.kind === "boss") {
      const mi = view.missions.findIndex((m) => m.id === next.missionId);
      continueHref = `/play/${next.kind}/${next.missionId}`;
      continueLabel = next.kind === "quiz" ? `Mission ${mi + 1} quiz` : `Mission ${mi + 1} boss challenge`;
    } else {
      continueHref = `/play/capstone/${view.course.slug}`;
      continueLabel = "Your capstone project";
    }
  }
  const [zone, look, spent] = await Promise.all([view ? zoneName(view.course.track_id) : Promise.resolve(null), kubeLook(student.id), coinsSpent(student.id)]);

  return (
    <WithTabs>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5">
        <header className="rounded-band border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Kube stage={rankIndex(rank) as KubeStage} size={44} animate={false} label="" accessory={look.accessory} color={look.color} />
              <div>
                <p className="font-display text-xl font-black">{student.display_name}</p>
                <p className="text-sm text-muted">
                  {RANK_LABEL[rank] ?? "Rookie"} · {BAND_LABEL[student.band as Band]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MuteToggle />
              <form action={switchProfile}>
                <Button type="submit" variant="ghost" className="min-h-9 px-3 text-sm">
                  Switch
                </Button>
              </form>
            </div>
          </div>
          <XpBar xp={student.xp} className="mt-3" />
          <p className="mt-1 text-xs text-muted">
            <Link href="/play/me" className="underline-offset-4 hover:underline">
              🪙 {coinsEarned(student.xp) - spent} coins · open the Locker
            </Link>
          </p>
          <p className="mt-2 text-sm">
            <span className="font-semibold">
              {stats.streak.daysThisWeek} of {stats.streak.goal} days
            </span>{" "}
            <span className="text-muted">
              this week
              {stats.streak.weeks > 0 ? ` · ${stats.streak.weeks}-week streak` : ""}
            </span>
          </p>
        </header>

        <section className="rounded-band border border-line bg-surface p-5">
          <div className="flex items-start gap-4">
            <Kube expression={continueHref ? "happy" : view?.capstoneSubmission?.status === "pending" ? "thinking" : "celebrate"} size={student.band === "explore" ? 96 : 72} />
            <div className="flex-1">
              {continueHref ? (
                <>
                  <p className="text-lg font-semibold">
                    Ready for a few minutes of {view?.course.short_title ?? view?.course.title}?
                  </p>
                  {zone && <p className="text-sm text-muted">{zone}</p>}
                  <p className="mt-3 text-sm font-semibold text-muted">Continue</p>
                  <p className="font-semibold">{continueLabel}</p>
                  <Link href={continueHref} className={buttonClass("primary", "mt-3 w-full sm:w-auto")}>
                    Play
                  </Link>
                </>
              ) : view?.capstoneSubmission?.status === "pending" ? (
                <>
                  <p className="text-lg font-semibold">Your capstone is with our reviewers.</p>
                  <p className="text-muted">
                    We aim to reply within 48 hours. Meanwhile, do a warm-up or peek at what&apos;s next on your Journey.
                  </p>
                  <Link href="/play/journey" className={buttonClass("secondary", "mt-3")}>
                    Open Journey
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold">You&apos;re all caught up.</p>
                  <p className="text-muted">New missions are on the way. Check your Journey to see what&apos;s next.</p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-band border border-line bg-surface p-4">
          <div>
            <p className="font-semibold">Daily warm-up</p>
            <p className="text-sm text-muted">
              {stats.warmupDue > 0
                ? `${Math.min(stats.warmupDue, 5)} questions to bring back`
                : "3 quick questions from earlier lessons"}
            </p>
          </div>
          <Link href="/play/warmup" className={buttonClass("secondary")}>
            Start the warm-up
          </Link>
        </section>
      </main>
    </WithTabs>
  );
}

async function zoneName(trackId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from("tracks").select("zone_name").eq("id", trackId).maybeSingle();
  return data?.zone_name ?? null;
}
