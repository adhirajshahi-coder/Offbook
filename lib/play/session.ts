import "server-only";
import { redirect } from "next/navigation";
import { getActiveStudent, getParent } from "@/lib/auth";

export type Student = NonNullable<Awaited<ReturnType<typeof getActiveStudent>>>;

/**
 * The child whose profile is open in Play, verified: parent signed in,
 * signed profile cookie bound to that parent, consent active, plan active.
 * Every Play server action starts here before touching the service role.
 */
export async function requireStudent(): Promise<Student> {
  const parent = await getParent();
  if (!parent) redirect("/login?next=/play");
  const student = await getActiveStudent();
  if (!student) redirect("/play");
  return student;
}

/** For server actions: same checks, but throw instead of redirecting. */
export async function studentOrThrow(): Promise<Student> {
  const student = await getActiveStudent();
  if (!student) throw new Error("Open your profile first");
  return student;
}
