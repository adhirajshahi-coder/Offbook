"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Registers the service worker in production builds (dev servers rebuild too often for it). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No service worker: the site still works online.
    });
  }, []);
  return null;
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Add to home screen", shown only when the browser offers it (Android Chrome, desktop Chrome/Edge). */
export function InstallButton({ className }: { className?: string }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p className={cn("text-sm text-muted", className)}>Offbook is on your home screen.</p>;
  if (!event) return null;
  return (
    <button
      type="button"
      className={cn("rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold", className)}
      onClick={async () => {
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setEvent(null);
      }}
    >
      Add Offbook to home screen
    </button>
  );
}
