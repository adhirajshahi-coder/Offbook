"use client";

import { useTransition } from "react";
import { startCourse } from "@/app/play/learn/actions";
import { Button } from "@/components/ui/button";

export function StartCourseButton({ courseId }: { courseId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" className="mt-4" disabled={pending} onClick={() => start(() => startCourse(courseId))}>
      {pending ? "Starting…" : "Start course"}
    </Button>
  );
}
