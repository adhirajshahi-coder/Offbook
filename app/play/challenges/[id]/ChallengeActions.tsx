"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { askParent, submitChallenge } from "@/app/play/challenges/actions";
import { Kube } from "@/components/kid/Kube";
import { Button, buttonClass } from "@/components/ui/button";
import { celebrate } from "@/lib/client/feedback";
import type { ChallengeState } from "@/lib/play/challenges";

export function ChallengeActions({ id, state, requiredCourse }: { id: string; state: ChallengeState; requiredCourse: { slug: string; title: string } | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (state === "locked") {
    return (
      <p className="text-muted">
        Opens when you start{" "}
        {requiredCourse ? (
          <Link href={`/play/course/${requiredCourse.slug}`} className="underline underline-offset-4">
            {requiredCourse.title}
          </Link>
        ) : (
          "its course"
        )}
        .
      </p>
    );
  }

  if (state === "ask") {
    return (
      <div className="space-y-2">
        <p>Show this to a parent. They&apos;ll read the safety note and say okay in the Parent Zone.</p>
        {error && <p role="alert" className="text-sm text-coral">{error}</p>}
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await askParent(id);
            setBusy(false);
            if (r.ok) router.refresh();
            else setError(r.error ?? "That didn't go through.");
          }}
        >
          {busy ? "Asking…" : "Ask a parent"}
        </Button>
      </div>
    );
  }

  if (state === "waiting") {
    return (
      <div className="flex items-center gap-3 rounded-band bg-surface p-4">
        <Kube expression="sleepy" size={60} />
        <p>Request sent. Once a parent says okay in the Parent Zone, you can start.</p>
      </div>
    );
  }

  if (state === "submitted" || sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Kube expression="celebrate" size={100} />
        <p className="font-semibold">Sent for review. Reviewers usually reply within 48 hours.</p>
        <Link href="/play/challenges" className={buttonClass("secondary")}>
          Back to challenges
        </Link>
      </div>
    );
  }

  if (state === "approved" || state === "rejected") return null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await submitChallenge({ challengeId: id, text, link });
        setBusy(false);
        if (r.ok) {
          celebrate("big");
          setSent(true);
        } else setError(r.error ?? "That didn't go through.");
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="challenge-text" className="font-semibold">
          {state === "revision" ? "Update your write-up" : "What did you do, and what did you find out?"}
        </label>
        <textarea
          id="challenge-text"
          rows={8}
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-band border-2 border-line bg-bg px-3 py-2 text-base text-text"
        />
        <p className="text-xs text-muted">Use your first name only. Don&apos;t include phone numbers, addresses or photos of people.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="challenge-link" className="font-semibold">
          Link to your work <span className="font-normal text-muted">(optional, like a shared doc)</span>
        </label>
        <input
          id="challenge-link"
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
