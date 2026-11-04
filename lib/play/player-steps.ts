import "server-only";
import type { PlayerStep } from "@/app/play/lesson/[id]/LessonPlayer";
import { isMuxSigningConfigured, signPlaybackToken } from "@/lib/mux";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Turn stored lesson steps into what the player needs. Practice steps carry
 * group keys only, never questions or answers. Video steps get short-lived
 * signed tokens, so callers must check access first (unlocks for students,
 * staff role for previews).
 */
export async function buildPlayerSteps(lessonId: string): Promise<PlayerStep[]> {
  const db = createAdminClient();
  const { data: steps } = await db.from("lesson_steps").select("id, type, content, order_index").eq("lesson_id", lessonId).order("order_index");

  const videoIds = (steps ?? []).flatMap((s) => {
    const id = (s.content as { video_id?: string }).video_id;
    return s.type === "video" && id ? [id] : [];
  });
  const { data: videoRows } = videoIds.length
    ? await db.from("videos").select("id, title, status, mux_playback_id, captions_url").in("id", videoIds)
    : { data: [] as { id: string; title: string; status: string; mux_playback_id: string | null; captions_url: string | null }[] };
  const signing = isMuxSigningConfigured();
  const videoFor = (id?: string) => {
    const v = (videoRows ?? []).find((r) => r.id === id);
    if (!v || v.status !== "ready" || !v.mux_playback_id || !signing) return null;
    return {
      playbackId: v.mux_playback_id,
      token: signPlaybackToken(v.mux_playback_id, { ttlSec: 3 * 3600 }),
      thumbnailToken: signPlaybackToken(v.mux_playback_id, { aud: "t", ttlSec: 3 * 3600 }),
      title: v.title,
      captionsUrl: v.captions_url,
    };
  };

  return (steps ?? []).map((s): PlayerStep => {
    const c = s.content as Record<string, unknown>;
    switch (s.type) {
      case "study_deck":
        return { id: s.id, type: "study_deck", label: c.label as string | undefined, cards: (c.cards as never) ?? [] };
      case "practice":
        return { id: s.id, type: "practice", label: c.label as string | undefined, groups: (c.groups as string[]) ?? [] };
      case "make":
        return { id: s.id, type: "make", prompt: String(c.prompt ?? ""), rubric: (c.rubric as string[]) ?? [] };
      case "reflect":
        return { id: s.id, type: "reflect", prompt: String(c.prompt ?? "What surprised you?") };
      default:
        return {
          id: s.id,
          type: "video",
          label: c.label as string | undefined,
          video: videoFor(c.video_id as string | undefined),
          startSec: (c.start_sec as number | null) ?? null,
          endSec: (c.end_sec as number | null) ?? null,
          minWatchPct: (c.min_watch_pct as number | undefined) ?? 85,
        };
    }
  });
}
