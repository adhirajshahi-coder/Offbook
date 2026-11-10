"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { isCalm, setCalm } from "@/lib/client/calm";

function subscribeCalm(cb: () => void) {
  window.addEventListener("offbook:calm", cb);
  return () => window.removeEventListener("offbook:calm", cb);
}

/** True when the student chose calm motion in the app. */
export function useCalm(): boolean {
  return useSyncExternalStore(subscribeCalm, isCalm, () => false);
}

/** Applies the saved calm-motion choice to the page (CSS reads html[data-calm]). */
export function CalmSync() {
  const calm = useCalm();
  useEffect(() => {
    document.documentElement.dataset.calm = calm ? "true" : "false";
  }, [calm]);
  return null;
}

export function CalmToggle() {
  const calm = useCalm();
  return (
    <button type="button" onClick={() => setCalm(!calm)} aria-pressed={calm} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold">
      {calm ? "Calm motion: on" : "Calm motion: off"}
    </button>
  );
}

const START_KEY = "offbook:session-start";
const DISMISS_KEY = "offbook:break-dismissed";
const BREAK_AFTER_MS = 45 * 60_000;

/**
 * Healthy-use guardrail (PRD §7.8): after about 45 minutes in one sitting, a
 * gentle "take a break" note. Never blocks, never guilt-trips, easy to close.
 */
export function BreakNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let start = Number(sessionStorage.getItem(START_KEY) ?? 0);
    if (!start) {
      start = Date.now();
      try {
        sessionStorage.setItem(START_KEY, String(start));
      } catch {
        /* storage blocked */
      }
    }
    const check = () => {
      const dismissed = Number(sessionStorage.getItem(DISMISS_KEY) ?? 0);
      const since = Math.max(start, dismissed);
      setShow(Date.now() - since >= BREAK_AFTER_MS);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!show) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-30 mx-auto flex max-w-md items-center gap-3 rounded-band border border-line bg-surface p-3 shadow-lg md:bottom-6">
      <span aria-hidden className="text-2xl">
        🌿
      </span>
      <p className="flex-1 text-sm">
        <strong>Great session!</strong> You&apos;ve been learning for a while. A stretch, some water or a walk will help it stick.
      </p>
      <button
        type="button"
        className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-on-accent"
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {
            /* storage blocked */
          }
          setShow(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
