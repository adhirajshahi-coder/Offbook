import type { Metadata } from "next";
import { CubeMark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

// Precached by the service worker; shown when a page can't load offline.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <CubeMark className="h-16 w-16" />
      <h1 className="text-3xl font-black">You&apos;re offline</h1>
      <p className="text-muted">Offbook needs the internet to save your progress. Check your Wi-Fi or data, then try again.</p>
      <a href="/play" className="inline-flex min-h-11 items-center rounded-band bg-accent px-5 font-semibold text-on-accent">
        Try again
      </a>
    </main>
  );
}
