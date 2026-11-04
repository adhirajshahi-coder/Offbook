import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/hq/forms";
import { Card, Notice, PageHeader, StatusBadge } from "@/components/hq/ui";
import { VideoPlayer } from "@/components/kid/VideoPlayer";
import { requireStaff } from "@/lib/auth";
import { isMuxSigningConfigured, signPlaybackToken } from "@/lib/mux";
import { createClient } from "@/lib/supabase/server";
import { refreshVideo } from "../actions";
import { VideoForm } from "./VideoForm";

export const metadata: Metadata = { title: "Video" };

export default async function VideoPage({ params }: PageProps<"/hq/content/videos/[id]">) {
  await requireStaff(["content", "teacher"]);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: v }, { data: tracks }, { data: usedIn }] = await Promise.all([
    supabase.from("videos").select("*").eq("id", id).maybeSingle(),
    supabase.from("tracks").select("id, zone_name, order_index").order("order_index"),
    supabase.from("lesson_steps").select("lesson_id, lessons(title)").eq("type", "video").contains("content", { video_id: id }),
  ]);
  if (!v) notFound();

  const canPlay = v.status === "ready" && v.mux_playback_id && isMuxSigningConfigured();

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        title={v.title}
        crumbs={[{ href: "/hq/content/videos", label: "Videos" }]}
        actions={
          <>
            <StatusBadge status={v.status} />
            {v.status !== "ready" && (
              <ActionButton
                onClick={async () => {
                  "use server";
                  return refreshVideo(id);
                }}
              >
                Check status
              </ActionButton>
            )}
          </>
        }
      />
      {v.status === "errored" && <Notice tone="error">{v.error_message ?? "Mux couldn't process this file."} Upload it again, ideally as an mp4.</Notice>}
      {v.duration_sec && v.duration_sec > 360 && <Notice tone="warn">This clip is over 6 minutes. Students learn best from 2 to 5 minute clips with one idea each.</Notice>}
      {!v.captions_url && v.status === "ready" && <Notice tone="warn">No captions yet. Add a .vtt captions link below so every student can follow along.</Notice>}

      <Card title="Preview">
        {canPlay ? (
          <VideoPlayer
            playbackId={v.mux_playback_id!}
            token={signPlaybackToken(v.mux_playback_id!, { ttlSec: 3600 })}
            thumbnailToken={signPlaybackToken(v.mux_playback_id!, { aud: "t", ttlSec: 3600 })}
            title={v.title}
            captionsUrl={v.captions_url}
          />
        ) : (
          <p className="text-sm text-[#6b6778]">
            {v.status === "ready" ? "Add the Mux signing key to preview signed videos." : "The preview appears once Mux has finished processing."}
          </p>
        )}
        {v.duration_sec && (
          <p className="mt-2 text-xs text-[#6b6778]">
            Length {Math.floor(v.duration_sec / 60)}:{String(v.duration_sec % 60).padStart(2, "0")}
          </p>
        )}
      </Card>

      <Card title="Details">
        <VideoForm
          video={{
            id: v.id,
            title: v.title,
            teacher: v.teacher ?? "",
            trackId: v.track_id ?? "",
            tags: (v.tags ?? []).join(", "),
            transcript: v.transcript ?? "",
            captionsUrl: v.captions_url ?? "",
          }}
          tracks={(tracks ?? []).map((t) => ({ id: t.id, zone: t.zone_name }))}
        />
      </Card>

      <Card title="Used in">
        {(usedIn ?? []).length === 0 ? (
          <p className="text-sm text-[#6b6778]">Not attached to a lesson yet. Open a lesson and add a Video step.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {(usedIn ?? []).map((u) => (
              <li key={u.lesson_id}>
                <a href={`/hq/content/lessons/${u.lesson_id}`} className="text-violet-700 hover:underline">
                  {(u.lessons as unknown as { title: string }).title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
