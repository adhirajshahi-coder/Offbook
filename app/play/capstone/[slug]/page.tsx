import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/play/session";
import { loadCourseBySlug } from "@/lib/play/state";
import { CapstoneForm } from "./CapstoneForm";

export const metadata: Metadata = { title: "Capstone" };

export default async function CapstonePage({ params }: PageProps<"/play/capstone/[slug]">) {
  const student = await requireStudent();
  const { slug } = await params;
  const view = await loadCourseBySlug(student, slug);
  if (!view) notFound();
  if (view.inside.capstone !== "available") redirect(`/play/course/${slug}`);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-5">
      <Link href={`/play/course/${slug}`} className="text-sm text-muted underline underline-offset-4">
        Back to the course
      </Link>
      <h1 className="mt-4 text-3xl font-black">Capstone project</h1>
      <p className="mt-1 text-muted">{view.course.short_title ?? view.course.title}</p>
      <div className="mt-4 rounded-band border border-line bg-surface p-5">
        <p className="font-semibold">Your brief</p>
        <p className="mt-1">{view.course.capstone?.brief}</p>
        {view.capstoneSubmission?.status === "revision" && view.capstoneSubmission.feedback && (
          <p className="mt-3 rounded-band bg-sky/20 px-3 py-2 text-sm">
            <span className="font-semibold">Reviewer&apos;s note: </span>
            {view.capstoneSubmission.feedback}
          </p>
        )}
      </div>
      <div className="mt-4 rounded-band border border-line bg-surface p-5">
        <CapstoneForm courseId={view.course.id} courseSlug={slug} />
      </div>
    </main>
  );
}
