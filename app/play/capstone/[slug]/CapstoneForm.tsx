"use client";

import Link from "next/link";
import { useState } from "react";
import { submitCapstone } from "@/app/play/learn/actions";
import { Kube } from "@/components/kid/Kube";
import { Button, buttonClass } from "@/components/ui/button";
import { celebrate } from "@/lib/client/feedback";

export function CapstoneForm({ courseId, courseSlug }: { courseId: string; courseSlug: string }) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Kube expression="celebrate" size={110} />
        <h2 className="text-2xl font-black">Sent for review!</h2>
        <p className="max-w-md text-muted">
          Our reviewers usually reply within 48 hours. You can peek at the next course while you wait.
        </p>
        <Link href={`/play/course/${courseSlug}`} className={buttonClass("primary")}>
          Back to the course
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await submitCapstone({ courseId, text, link });
        setBusy(false);
        if (r.ok) {
          celebrate("big");
          setSent(true);
        } else setError(r.error ?? "That didn't go through.");
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="capstone-text" className="font-semibold">
          What did you make, and what did you learn?
        </label>
        <textarea
          id="capstone-text"
          rows={8}
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-band border-2 border-line bg-bg px-3 py-2 text-base text-text"
        />
        <p className="text-xs text-muted">Use your first name only. Don&apos;t include phone numbers, addresses or photos of people.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="capstone-link" className="font-semibold">
          Link to your work <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="capstone-link"
          type="url"
          inputMode="url"
          placeholder="https://"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="min-h-11 rounded-band border-2 border-line bg-bg px-3 text-base text-text"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-band border border-coral bg-coral/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || text.trim().length < 60}>
        {busy ? "Sending…" : "Send for review"}
      </Button>
    </form>
  );
}
