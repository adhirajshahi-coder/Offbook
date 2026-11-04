"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { grantChallenge, revokeChallenge } from "./actions";

export function ChallengeRequest(props: {
  studentId: string;
  challengeId: string;
  childName: string;
  title: string;
  brief?: string;
  safetyNote?: string;
  requestedOn?: string;
  grantedOn?: string;
}) {
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { studentId: props.studentId, challengeId: props.challengeId };

  if (props.grantedOn) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-line bg-white p-3 text-sm">
        <span>
          <strong>{props.childName}</strong>: {props.title} · allowed {props.grantedOn}
        </span>
        <button
          type="button"
          disabled={busy}
          className="text-muted underline underline-offset-4"
          onClick={async () => {
            setBusy(true);
            await revokeChallenge(ids);
            setBusy(false);
          }}
        >
          Take back
        </button>
      </div>
    );
  }

  const ackId = `ack-${props.studentId}-${props.challengeId}`;
  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      <p className="text-sm text-muted">
        {props.childName} asked on {props.requestedOn}
      </p>
      <h3 className="text-lg font-bold">{props.title}</h3>
      <p className="mt-1 text-sm">{props.brief}</p>
      <div className="mt-3 rounded-[10px] border-2 border-sun bg-[#fffbea] p-3 text-sm">
        <p className="font-bold">Safety note</p>
        <p className="mt-1">{props.safetyNote}</p>
      </div>
      <label htmlFor={ackId} className="mt-3 flex items-start gap-2 text-sm">
        <input id={ackId} type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1" />
        <span>I&apos;ve read the safety note and I&apos;ll support {props.childName} with this challenge.</span>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-coral">
          {error}
        </p>
      )}
      <Button
        className="mt-3"
        disabled={!ack || busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await grantChallenge({ ...ids, acknowledged: ack });
          setBusy(false);
          if (!r.ok) setError(r.error ?? "That didn't go through.");
        }}
      >
        {busy ? "Saving…" : `Allow ${props.childName} to start`}
      </Button>
    </div>
  );
}
