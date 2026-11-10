import { BreakNudge, CalmSync } from "@/components/kid/Wellbeing";
import { getActiveStudent, requireParent } from "@/lib/auth";

// The band theme wraps the whole student app, so every screen inherits the
// look for the child's class (PRD §4.4). Before a profile is picked, the
// Explore theme is used for the picker.
export default async function PlayLayout({ children }: LayoutProps<"/play">) {
  await requireParent("/play");
  const student = await getActiveStudent();

  return (
    <div data-band={student?.band ?? "explore"} className="flex min-h-full flex-1 flex-col bg-bg text-text">
      {children}
      <CalmSync />
      {student && <BreakNudge />}
    </div>
  );
}
