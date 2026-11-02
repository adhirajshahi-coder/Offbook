import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Kube } from "@/components/kid/Kube";
import { WithTabs } from "@/components/kid/TabBar";
import { buttonClass } from "@/components/ui/button";
import type { LessonState } from "@/lib/gamification/unlocks";
import { requireStudent } from "@/lib/play/session";
import { loadSkillGraph } from "@/lib/play/skills";
import { loadCourseBySlug, loadWorld } from "@/lib/play/state";
import { cn } from "@/lib/utils";
import { SkillGraph } from "./SkillGraph";
import { StartCourseButton } from "./StartCourseButton";

export const metadata: Metadata = { title: "Course" };

export default async function CoursePage({ params }: PageProps<"/play/course/[slug]">) {
  const student = await requireStudent();
  const { slug } = await params;
  const view = await loadCourseBySlug(student, slug);
  if (!view) notFound();

  const { course, state, missions, inside, upcoming } = view;
  const locked = state === "locked";
  const graph = locked ? { skills: [], links: [] } : await loadSkillGraph(student.id, course.id);

  // For a locked course, say what opens it.
  let unlockHint = "";
  if (locked) {
    const world = await loadWorld(student);
    unlockHint =
      course.level !== student.content_level
        ? `Opens at Level ${course.level}.`
        : (() => {
            const active = world.courses.find((c) => c.id === world.unlock.activeCourseId);
            return active ? `Opens after ${active.short_title ?? active.title}.` : "Opens later on your path.";
          })();
  }

  return (
    <WithTabs>
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-5">
        <Link href="/play/journey" className="text-sm text-muted underline underline-offset-4">
          Back to Journey
        </Link>

        <header className="rounded-band border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-muted">Level {course.level}</p>
          <h1 className="text-3xl font-black">{course.short_title ?? course.title}</h1>
          {course.short_title && <p className="text-muted">{course.title}</p>}
          <p className="mt-2 text-lg">{course.promise}</p>
          {locked && (
            <p className="mt-3 inline-block rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold text-muted">
              Locked · {unlockHint}
            </p>
          )}
          {state === "preview" && (
            <p className="mt-3 text-sm text-muted">Preview: this opens once your capstone is reviewed.</p>
          )}
          {state === "available" && missions.length > 0 && <StartCourseButton courseId={course.id} />}
          {state === "available" && missions.length === 0 && (
            <p className="mt-3 text-sm text-muted">This course&apos;s lessons are being written. They&apos;ll appear here soon.</p>
          )}
        </header>

        {!locked && graph.skills.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-black">Skill map</h2>
            <SkillGraph skills={graph.skills} links={graph.links} />
          </section>
        )}

        {!locked && (
          <section className="space-y-4">
            <h2 className="text-xl font-black">Missions</h2>
            {missions.map((m, mi) => {
              const ms = inside.missions[m.id];
              return (
                <div key={m.id} className="rounded-band border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-muted">Mission {mi + 1}</p>
                      <h3 className="font-display text-lg font-black">{m.title}</h3>
                      <p className="text-sm text-muted">You&apos;ll make: {m.output_description}</p>
                    </div>
                    {ms?.complete && <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-ink">Done</span>}
                  </div>
                  <ol className="mt-3 flex flex-col gap-2">
                    {m.lessons.map((l, li) => (
                      <Row
                        key={l.id}
                        state={inside.lessons[l.id]}
                        href={`/play/lesson/${l.id}`}
                        label={`Lesson ${li + 1}: ${l.title}`}
                        meta={`${l.est_minutes} min`}
                      />
                    ))}
                    <Row state={ms?.quiz ?? "locked"} href={`/play/quiz/${m.id}`} label="Mission quiz" meta="80% to pass" />
                    <Row state={ms?.boss ?? "locked"} href={`/play/boss/${m.id}`} label={`Boss: ${m.boss_config.title ?? "Boss challenge"}`} meta="" />
                  </ol>
                </div>
              );
            })}
            {upcoming.map((m) => (
              <div key={m.title} className="rounded-band border border-dashed border-line p-4 opacity-80">
                <p className="text-sm font-semibold text-muted">Coming soon</p>
                <h3 className="font-display text-lg font-black">{m.title}</h3>
                <p className="text-sm text-muted">You&apos;ll make: {m.output_description}</p>
              </div>
            ))}
            {missions.length > 0 && (
              <div className="rounded-band border border-line bg-surface p-4">
                <p className="text-sm font-semibold text-muted">Capstone project</p>
                <p className="mt-1">{course.capstone?.brief}</p>
                {inside.capstone === "available" && (
                  <Link href={`/play/capstone/${course.slug}`} className={buttonClass("primary", "mt-3")}>
                    Submit your capstone
                  </Link>
                )}
                {inside.capstone === "pending_review" && (
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <Kube expression="thinking" size={40} animate={false} label="" />
                    <p>Sent! Our reviewers usually reply within 48 hours.</p>
                  </div>
                )}
                {inside.capstone === "completed" && <p className="mt-3 text-sm font-semibold">Approved. Course complete!</p>}
                {inside.capstone === "locked" && <p className="mt-2 text-sm text-muted">Opens after every mission is done.</p>}
              </div>
            )}
          </section>
        )}
      </main>
    </WithTabs>
  );
}

function Row({ state, href, label, meta }: { state: LessonState; href: string; label: string; meta: string }) {
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
          state === "completed" ? "bg-mint text-ink" : state === "available" ? "bg-accent text-on-accent" : "bg-surface-2 text-muted",
        )}
      >
        {state === "completed" ? "✓" : state === "available" ? "▶" : "•"}
      </span>
      <span className="flex-1">
        {label}
        <span className="sr-only"> ({state === "completed" ? "done" : state === "available" ? "ready" : "locked"})</span>
      </span>
      {meta && <span className="text-xs text-muted">{meta}</span>}
    </>
  );
  return (
    <li>
      {state === "locked" ? (
        <div className="flex items-center gap-3 rounded-band px-2 py-2 text-muted">{body}</div>
      ) : (
        <Link href={href} className="flex items-center gap-3 rounded-band px-2 py-2 hover:bg-surface-2">
          {body}
        </Link>
      )}
    </li>
  );
}
