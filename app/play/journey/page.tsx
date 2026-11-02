import type { Metadata } from "next";
import Link from "next/link";
import { WithTabs } from "@/components/kid/TabBar";
import type { CourseState } from "@/lib/gamification/unlocks";
import { requireStudent } from "@/lib/play/session";
import { loadWorld, type CourseRow } from "@/lib/play/state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Journey" };

const STATE_LABEL: Record<CourseState, string> = {
  locked: "Locked",
  available: "Ready to start",
  in_progress: "In progress",
  pending_review: "Waiting for review",
  completed: "Completed",
  preview: "Preview",
};

export default async function JourneyPage() {
  const student = await requireStudent();
  const world = await loadWorld(student);
  const { states } = world.unlock;

  // Show this level's courses, plus anything already finished elsewhere.
  const visible = (c: CourseRow) =>
    (c.level === student.content_level && c.kind === "standard") ||
    states[c.id] === "completed" ||
    (c.kind === "bridge" && states[c.id] !== "locked");
  const slotTitle = new Map(world.slots.map((s) => [s.id, s.title]));

  const bridge = world.courses.find((c) => c.kind === "bridge" && visible(c));

  return (
    <WithTabs>
      <main className="mx-auto w-full max-w-4xl px-4 py-5">
        <h1 className="text-3xl font-black">Your journey</h1>
        <p className="mt-1 text-muted">
          Level {student.content_level}. Every course is on the map. They open one at a time, so you finish what you start.
        </p>

        {bridge && (
          <div className="mt-5">
            <CourseTile course={bridge} state={states[bridge.id]} note="Start here: the Level 1 essentials" />
          </div>
        )}

        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {world.tracks.map((t) => {
            const courses = world.courses
              .filter((c) => c.track_id === t.id && c.kind === "standard" && visible(c))
              .sort((a, b) => a.level - b.level || (a.order_index ?? 50) - (b.order_index ?? 50));
            return (
              <li key={t.id} className="rounded-band border border-line bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  <h2 className="font-display text-lg font-black">{t.zone_name}</h2>
                </div>
                {courses.length === 0 ? (
                  <p className="text-sm text-muted">Opens at a later level.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {courses.map((c) => (
                      <li key={c.id}>
                        <CourseTile
                          course={c}
                          state={states[c.id]}
                          note={c.slot_id ? `Choice: ${slotTitle.get(c.slot_id)}` : undefined}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </WithTabs>
  );
}

function CourseTile({ course, state, note }: { course: CourseRow; state: CourseState; note?: string }) {
  const locked = state === "locked";
  return (
    <Link
      href={`/play/course/${course.slug}`}
      className={cn(
        "flex items-start justify-between gap-3 rounded-band border p-3 transition-colors",
        locked ? "border-dashed border-line opacity-70" : "border-line bg-bg hover:border-accent",
        state === "in_progress" && "border-accent",
      )}
    >
      <div>
        <p className="font-semibold">{course.short_title ?? course.title}</p>
        <p className="text-sm text-muted">{course.promise}</p>
        {note && <p className="mt-1 text-xs font-semibold text-muted">{note}</p>}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
          state === "completed" && "bg-mint text-ink",
          state === "in_progress" && "bg-sun text-ink",
          state === "available" && "bg-accent text-on-accent",
          (state === "locked" || state === "preview" || state === "pending_review") && "bg-surface-2 text-muted",
        )}
      >
        {STATE_LABEL[state]}
      </span>
    </Link>
  );
}
