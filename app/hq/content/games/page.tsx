import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, StatusBadge } from "@/components/hq/ui";
import { requireStaff } from "@/lib/auth";
import { PLAYABLE } from "@/lib/play/games";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Games" };

export default async function GamesAdminPage() {
  await requireStaff(["content"]);
  const supabase = await createClient();
  const { data: games } = await supabase.from("games").select("id, slug, title, status, courses(title)").order("title");

  return (
    <div className="max-w-4xl">
      <PageHeader title="Games" description="Each game's levels and content live in a JSON config, checked against the game's rules before saving." />
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[#6b6778]">
            <tr>
              <th className="pb-2 font-semibold">Game</th>
              <th className="pb-2 font-semibold">Unlocks with</th>
              <th className="pb-2 font-semibold">Engine</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(games ?? []).map((g) => {
              const editable = (PLAYABLE as readonly string[]).includes(g.slug);
              return (
                <tr key={g.id} className="border-t border-[#eeecf2]">
                  <td className="py-2">
                    {editable ? (
                      <Link href={`/hq/content/games/${g.slug}`} className="font-semibold text-violet-700 hover:underline">
                        {g.title}
                      </Link>
                    ) : (
                      <span className="font-semibold">{g.title}</span>
                    )}
                  </td>
                  <td className="py-2">{(g.courses as unknown as { title: string } | null)?.title ?? "—"}</td>
                  <td className="py-2 text-[#6b6778]">{editable ? "Ready" : "Phase 6"}</td>
                  <td className="py-2">
                    <StatusBadge status={g.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
