"use client";

import { useSyncExternalStore } from "react";
import { isMuted, setMuted } from "@/lib/client/feedback";

function subscribe(cb: () => void) {
  window.addEventListener("offbook:mute", cb);
  return () => window.removeEventListener("offbook:mute", cb);
}

export function MuteToggle() {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={muted}
      className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold"
    >
      {muted ? "Sound off" : "Sound on"}
    </button>
  );
}
