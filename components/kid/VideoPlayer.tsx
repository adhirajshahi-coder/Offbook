"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useRef } from "react";

/**
 * Signed Mux playback. Reports how much of the segment has been watched
 * (unique seconds, so skipping ahead doesn't count) and stops at endSec.
 */
export function VideoPlayer({
  playbackId,
  token,
  thumbnailToken,
  title,
  startSec,
  endSec,
  captionsUrl,
  onProgress,
}: {
  playbackId: string;
  token: string;
  thumbnailToken?: string;
  title: string;
  startSec?: number | null;
  endSec?: number | null;
  captionsUrl?: string | null;
  onProgress?: (pct: number) => void;
}) {
  const watched = useRef(new Set<number>());

  return (
    <MuxPlayer
      playbackId={playbackId}
      tokens={{ playback: token, thumbnail: thumbnailToken }}
      metadata={{ video_title: title }}
      startTime={startSec ?? undefined}
      accentColor="#7B14FF"
      streamType="on-demand"
      style={{ aspectRatio: "16 / 9", width: "100%", borderRadius: 12, overflow: "hidden" }}
      onTimeUpdate={(e) => {
        const el = e.target as HTMLVideoElement;
        const t = Math.floor(el.currentTime);
        const start = startSec ?? 0;
        const end = endSec ?? Math.floor(el.duration || 0);
        if (endSec && el.currentTime >= endSec) el.pause();
        if (t >= start && t <= end) watched.current.add(t);
        const length = Math.max(1, end - start);
        onProgress?.(Math.min(100, Math.round((watched.current.size / length) * 100)));
      }}
    >
      {captionsUrl && <track kind="captions" src={captionsUrl} srcLang="en" label="English" default />}
    </MuxPlayer>
  );
}
