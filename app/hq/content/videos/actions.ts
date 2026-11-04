"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createDirectUpload, getAsset, getUpload, isMuxConfigured } from "@/lib/mux";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: boolean; error?: string; message?: string };

const MAX_FILES = 10;

/** One Mux direct upload per file. The browser then uploads straight to Mux. */
export async function startUploads(
  files: { title: string; teacher: string; trackId: string | null; tags: string[] }[],
): Promise<{ ok: boolean; error?: string; uploads?: { videoId: string; url: string }[] }> {
  const staff = await requireStaff(["content", "teacher"]);
  if (!isMuxConfigured()) return { ok: false, error: "Video upload isn't switched on yet: add the Mux keys to the server settings." };
  if (files.length === 0 || files.length > MAX_FILES) return { ok: false, error: `Upload 1 to ${MAX_FILES} files at a time.` };

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? siteUrl;
  const uploads = [];
  for (const f of files) {
    const { data: video, error } = await supabase
      .from("videos")
      .insert({
        title: f.title.trim().slice(0, 120) || "Untitled video",
        teacher: f.teacher.trim().slice(0, 80) || null,
        track_id: f.trackId,
        tags: f.tags.slice(0, 10),
        status: "uploading",
        uploaded_by: staff.id,
      })
      .select("id")
      .single();
    if (error || !video) return { ok: false, error: "Couldn't create the video record." };
    try {
      const up = await createDirectUpload({ passthrough: video.id, corsOrigin: origin });
      await supabase.from("videos").update({ mux_upload_id: up.id }).eq("id", video.id);
      uploads.push({ videoId: video.id, url: up.url });
    } catch (e) {
      console.error(e);
      await supabase.from("videos").update({ status: "errored", error_message: "Couldn't start the upload with Mux." }).eq("id", video.id);
      return { ok: false, error: "Mux didn't accept the upload. Try again in a minute." };
    }
  }
  revalidatePath("/hq/content/videos");
  return { ok: true, uploads };
}

/** Browser finished sending the file: Mux is now processing it. */
export async function markUploaded(videoId: string): Promise<Result> {
  await requireStaff(["content", "teacher"]);
  const supabase = await createClient();
  await supabase.from("videos").update({ status: "processing" }).eq("id", videoId).eq("status", "uploading");
  revalidatePath("/hq/content/videos");
  return { ok: true };
}

export async function markUploadFailed(videoId: string, reason: string): Promise<Result> {
  await requireStaff(["content", "teacher"]);
  const supabase = await createClient();
  await supabase.from("videos").update({ status: "errored", error_message: reason.slice(0, 300) }).eq("id", videoId);
  revalidatePath("/hq/content/videos");
  return { ok: true };
}

/**
 * Ask Mux for the latest status. The webhook normally does this; this
 * covers local development (webhooks can't reach localhost) and missed events.
 */
export async function refreshVideo(videoId: string): Promise<Result> {
  await requireStaff(["content", "teacher"]);
  if (!isMuxConfigured()) return { ok: false, error: "Mux isn't configured." };
  const supabase = await createClient();
  const { data: v } = await supabase.from("videos").select("id, mux_upload_id, mux_asset_id").eq("id", videoId).single();
  if (!v) return { ok: false, error: "Video not found." };
  let assetId = v.mux_asset_id;
  if (!assetId && v.mux_upload_id) {
    const up = await getUpload(v.mux_upload_id);
    if (up.status === "errored" || up.status === "cancelled" || up.status === "timed_out") {
      await supabase.from("videos").update({ status: "errored", error_message: up.error?.message ?? `Upload ${up.status}.` }).eq("id", videoId);
      revalidatePath("/hq/content/videos");
      return { ok: true, message: "The upload didn't finish." };
    }
    assetId = up.asset_id ?? null;
  }
  if (!assetId) return { ok: true, message: "Still uploading." };
  const a = await getAsset(assetId);
  await supabase.from("videos").update(assetPatch(a)).eq("id", videoId);
  revalidatePath("/hq/content/videos");
  revalidatePath(`/hq/content/videos/${videoId}`);
  return { ok: true, message: a.status === "ready" ? "Ready to use." : a.status === "errored" ? "Mux couldn't process it." : "Still processing." };
}

export async function assetPatchFor(a: Awaited<ReturnType<typeof getAsset>>) {
  return assetPatch(a);
}

function assetPatch(a: Awaited<ReturnType<typeof getAsset>>) {
  return {
    mux_asset_id: a.id,
    status: a.status === "ready" ? "ready" : a.status === "errored" ? "errored" : "processing",
    mux_playback_id: a.playback_ids?.find((p) => p.policy === "signed")?.id ?? a.playback_ids?.[0]?.id ?? null,
    duration_sec: a.duration ? Math.round(a.duration) : null,
    error_message: a.status === "errored" ? (a.errors?.messages?.join(" ") ?? "Mux couldn't process this file. Try a different format.") : null,
  };
}

export async function updateVideo(
  id: string,
  input: { title: string; teacher: string; trackId: string | null; tags: string; transcript: string; captionsUrl: string },
): Promise<Result> {
  await requireStaff(["content", "teacher"]);
  if (!input.title.trim()) return { ok: false, error: "Give the video a title." };
  let captions: string | null = null;
  if (input.captionsUrl.trim()) {
    try {
      const u = new URL(input.captionsUrl.trim());
      if (u.protocol !== "https:" || !u.pathname.endsWith(".vtt")) throw new Error();
      captions = u.toString();
    } catch {
      return { ok: false, error: "Captions must be an https link to a .vtt file." };
    }
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .update({
      title: input.title.trim().slice(0, 120),
      teacher: input.teacher.trim().slice(0, 80) || null,
      track_id: input.trackId,
      tags: input.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10),
      transcript: input.transcript.trim().slice(0, 20000) || null,
      captions_url: captions,
    })
    .eq("id", id);
  revalidatePath(`/hq/content/videos/${id}`);
  return error ? { ok: false, error: "That didn't save." } : { ok: true, message: "Saved." };
}
