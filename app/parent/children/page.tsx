import type { Metadata } from "next";
import { BAND_LABEL } from "@/lib/bands";
import { getChildren } from "@/lib/parent-data";
import { ChildManager } from "./ChildManager";

export const metadata: Metadata = { title: "Children" };

export default async function ChildrenPage() {
  const children = await getChildren();

  return (
    <div>
      <h1 className="text-3xl font-black">Children</h1>
      <p className="mt-1 text-muted">Change a PIN, update a class, or delete a profile.</p>
      <ul className="mt-6 flex flex-col gap-4">
        {children.map((c) => (
          <li key={c.id} className="rounded-[14px] border border-line bg-white p-5">
            <p className="text-lg font-semibold">{c.display_name}</p>
            <p className="mb-4 text-sm text-muted">
              Class {c.class_grade} · {BAND_LABEL[c.band]} look · Level {c.content_level} courses
            </p>
            <ChildManager child={c} />
          </li>
        ))}
        {children.length === 0 && (
          <li className="rounded-[14px] border border-dashed border-line bg-white p-6 text-muted">
            No profiles yet. Add one from the Overview tab.
          </li>
        )}
      </ul>
    </div>
  );
}
