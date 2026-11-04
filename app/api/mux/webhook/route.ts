import { NextResponse, type NextRequest } from "next/server";
import { verifyMuxSignature } from "@/lib/mux";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Mux webhook (PRD §10.2): uploading → processing → ready / errored.
 * Point Mux at https://<domain>/api/mux/webhook and set MUX_WEBHOOK_SECRET.
 * Idempotent: every event just writes the latest state.
 */
type MuxEvent = {
  type: string;
  object?: { id: string };
  data: {
    id: string;
    passthrough?: string;
    upload_id?: string;
    asset_id?: string;
    status?: string;
    duration?: number;
    playback_ids?: { id: string; policy: string }[];
    errors?: { messages?: string[] };
    new_asset_settings?: { passthrough?: string };
  };
};

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (!secret || !verifyMuxSignature(raw, request.headers.get("mux-signature") ?? "", secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as MuxEvent;
  const db = createAdminClient();
  const d = event.data;

  switch (event.type) {
    case "video.upload.asset_created": {
      const videoId = d.new_asset_settings?.passthrough;
      const match = videoId ? db.from("videos").update({ mux_asset_id: d.asset_id, status: "processing" }).eq("id", videoId) : db.from("videos").update({ mux_asset_id: d.asset_id, status: "processing" }).eq("mux_upload_id", d.id);
      await match;
      break;
    }
    case "video.upload.errored":
    case "video.upload.cancelled":
      await db.from("videos").update({ status: "errored", error_message: "The upload didn't finish. Try again." }).eq("mux_upload_id", d.id);
      break;
    case "video.asset.ready": {
      const patch = {
        mux_asset_id: d.id,
        status: "ready",
        mux_playback_id: d.playback_ids?.find((p) => p.policy === "signed")?.id ?? d.playback_ids?.[0]?.id ?? null,
        duration_sec: d.duration ? Math.round(d.duration) : null,
        error_message: null,
      };
      await (d.passthrough ? db.from("videos").update(patch).eq("id", d.passthrough) : db.from("videos").update(patch).eq("mux_asset_id", d.id));
      break;
    }
    case "video.asset.errored": {
      const patch = { status: "errored", error_message: d.errors?.messages?.join(" ") ?? "Mux couldn't process this file. Try an mp4." };
      await (d.passthrough ? db.from("videos").update(patch).eq("id", d.passthrough) : db.from("videos").update(patch).eq("mux_asset_id", d.id));
      break;
    }
  }
  return NextResponse.json({ ok: true });
}
