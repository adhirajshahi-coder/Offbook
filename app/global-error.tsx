"use client";

import { useEffect } from "react";

/** Last-resort boundary when the root layout itself fails. Plain HTML: no layout or styles are guaranteed here. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const body = JSON.stringify({ message: error.message || "Unknown error", digest: error.digest, path: window.location.pathname });
    navigator.sendBeacon?.("/api/errors", new Blob([body], { type: "application/json" }));
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "64px 16px", color: "#121214" }}>
        <h1>Something went wrong</h1>
        <p>That&apos;s on us. We&apos;ve been told about it.</p>
        <button type="button" onClick={reset} style={{ padding: "12px 20px", borderRadius: 12, border: 0, background: "#7B14FF", color: "#fff", fontWeight: 600 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
