"use client";

import dynamic from "next/dynamic";

// The home page's mini challenge loads after first paint, so the headline
// shows straight away on mobile data (PRD §17). The placeholder keeps its
// space so nothing jumps when it arrives.
export const LazyTryIt = dynamic(() => import("./TryItChallenge").then((m) => m.TryItChallenge), {
  ssr: false,
  loading: () => (
    <div data-band="explore" aria-hidden className="min-h-[420px] rounded-[22px] border border-line bg-surface p-5 shadow-sm">
      <div className="h-4 w-40 rounded bg-surface-2" />
      <div className="mt-6 h-6 w-3/4 rounded bg-surface-2" />
      <div className="mt-6 space-y-3">
        <div className="h-12 rounded-band bg-surface-2" />
        <div className="h-12 rounded-band bg-surface-2" />
        <div className="h-12 rounded-band bg-surface-2" />
      </div>
    </div>
  ),
});
