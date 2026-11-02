import type { Metadata } from "next";
import Link from "next/link";
import { CubeMark } from "@/components/brand/Logo";
import { Kube } from "@/components/kid/Kube";
import { Button, buttonClass } from "@/components/ui/button";
import { getActiveStudent } from "@/lib/auth";
import { BAND_LABEL, type Band } from "@/lib/bands";
import { createClient } from "@/lib/supabase/server";
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

  // Phase 0 shell of the Today screen. Phase 2 fills it with the continue
  // card, warm-up, weekly challenge and league (PRD §7.2).
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-3 rounded-band border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <CubeMark className="h-9 w-auto" />
          <div>
            <p className="font-display text-xl font-black">{student.display_name}</p>
            <p className="text-sm text-muted">
              Lv {student.level} · {BAND_LABEL[student.band as Band]} · Class {student.class_grade}
            </p>
          </div>
        </div>
        <form action={switchProfile}>
          <Button type="submit" variant="ghost">
            Switch profile
          </Button>
        </form>
      </header>

      <section className="flex items-center gap-4 rounded-band border border-line bg-surface p-5">
        <Kube expression="happy" size={student.band === "explore" ? 110 : 80} />
        <div>
          <p className="text-lg font-semibold">Your world is being built.</p>
          <p className="text-muted">Missions, games and challenges land here soon.</p>
        </div>
      </section>
    </main>
  );
}
