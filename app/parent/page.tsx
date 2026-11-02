import type { Metadata } from "next";
import { requireParent } from "@/lib/auth";
import { BAND_LABEL, type Band } from "@/lib/bands";
import { createClient } from "@/lib/supabase/server";
import { AddChildForm } from "./AddChildForm";

export const metadata: Metadata = { title: "Parent Zone" };

export default async function ParentHome() {
  const parent = await requireParent();
  const supabase = await createClient();
  const { data: children } = await supabase
    .from("students")
    .select("id, display_name, class_grade, band, content_level")
    .is("deleted_at", null)
    .order("created_at");

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_360px]">
      <section>
        <h1 className="text-3xl font-black">
          Hi{parent.name ? `, ${parent.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted">Your children&apos;s profiles live here.</p>

        <ul className="mt-6 flex flex-col gap-3">
          {(children ?? []).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-[14px] border border-line bg-white p-4"
            >
              <div>
                <p className="font-semibold">{c.display_name}</p>
                <p className="text-sm text-muted">
                  Class {c.class_grade} · {BAND_LABEL[c.band as Band]} · Level {c.content_level}
                </p>
              </div>
            </li>
          ))}
          {children?.length === 0 && (
            <li className="rounded-[14px] border border-dashed border-line bg-white p-6 text-muted">
              No profiles yet. Add your child to get started.
            </li>
          )}
        </ul>
      </section>

      <section className="h-fit rounded-[14px] border border-line bg-white p-5">
        <h2 className="mb-4 text-xl font-black">Add a child</h2>
        <AddChildForm />
      </section>
    </div>
  );
}
