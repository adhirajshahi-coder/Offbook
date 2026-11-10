"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shared error screen for error boundaries: reports the error (no personal data) and offers a way back. */
export function ErrorView({ error, reset, home = "/" }: { error: Error & { digest?: string }; reset: () => void; home?: string }) {
  useEffect(() => {
    const body = JSON.stringify({ message: error.message || "Unknown error", digest: error.digest, path: window.location.pathname });
    try {
      const queued = navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }));
      if (!queued) void fetch("/api/errors", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      // Reporting is best effort.
    }
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🧩
      </p>
      <h1 className="text-3xl font-black">Something went wrong</h1>
      <p className="text-muted">That&apos;s on us, not you. We&apos;ve been told about it. Try again, or head back.</p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-band bg-accent px-5 font-semibold text-on-accent">
          Try again
        </button>
        <Link href={home} className="inline-flex min-h-11 items-center rounded-band border border-line px-5 font-semibold">
          Go back
        </Link>
      </div>
    </main>
  );
}
