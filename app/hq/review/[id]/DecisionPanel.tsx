"use client";

import { useState } from "react";
import { ActionMessage, useAction } from "@/components/hq/forms";
import { Card, hqButton, hqTextarea } from "@/components/hq/ui";
import { assignToMe, decideSubmission, type Decision } from "../actions";

export function DecisionPanel(props: {
  id: string;
  open: boolean;
  rubric: string[];
  initialChecks: boolean[];
  feedback: string | null;
  canned: { label: string; text: string; decision: Decision }[];
  assigned: string | null;
  reviewedBy: string | null;
  kind: "make" | "capstone" | "challenge";
}) {
  const [checks, setChecks] = useState<boolean[]>(props.rubric.map((_, i) => Boolean(props.initialChecks[i])));
  const [feedback, setFeedback] = useState(props.feedback ?? "");
  const { pending, msg, run } = useAction();

  if (!props.open) {
    return (
      <Card title="Decision">
        <p className="text-sm">Reviewed by {props.reviewedBy ?? "a reviewer"}.</p>
        {props.feedback && <p className="mt-2 whitespace-pre-line rounded-md bg-[#f6f5f9] p-2 text-sm">{props.feedback}</p>}
        {props.rubric.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {props.rubric.map((r, i) => (
              <li key={r}>
                {props.initialChecks[i] ? "✓" : "–"} {r}
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }

  const decide = (decision: Decision) => run(() => decideSubmission({ id: props.id, decision, feedback, rubricChecks: checks }));
  const approveNote =
    props.kind === "capstone" ? "Completes the course, awards 150 XP, issues a certificate and emails the parent." : props.kind === "challenge" ? "Awards the challenge XP and adds it to the portfolio." : "Marks this sample as checked.";

  return (
    <Card
      title="Decision"
      actions={
        <button type="button" disabled={pending} className={hqButton("ghost", "h-7 text-xs")} onClick={() => run(() => assignToMe(props.id, props.assigned === "you"))}>
          {props.assigned === "you" ? "Unassign me" : props.assigned ? `Take over from ${props.assigned}` : "Assign to me"}
        </button>
      }
    >
      <fieldset>
        <legend className="text-xs font-semibold text-[#4f4b5c]">Rubric</legend>
        <ul className="mt-1 space-y-1.5">
          {props.rubric.map((r, i) => (
            <li key={r}>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
                {r}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="mt-4">
        <p className="text-xs font-semibold text-[#4f4b5c]">Quick feedback</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {props.canned.map((c) => (
            <button key={c.label} type="button" className={hqButton("secondary", "h-7 px-2 text-xs")} onClick={() => setFeedback(c.text)}>
              {c.label}
            </button>
          ))}
        </div>
        <label htmlFor="feedback" className="mt-3 block text-xs font-semibold text-[#4f4b5c]">
          Feedback to the student
        </label>
        <textarea id="feedback" rows={5} className={hqTextarea} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} />
        <p className="text-xs text-[#6b6778]">Kind and specific. The student sees this. Required to send back.</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={pending} className={hqButton("primary")} onClick={() => decide("approved")}>
          Approve
        </button>
        <button type="button" disabled={pending} className={hqButton("secondary")} onClick={() => decide("revision")}>
          Ask for changes
        </button>
        <button type="button" disabled={pending} className={hqButton("danger")} onClick={() => window.confirm("Reject this submission?") && decide("rejected")}>
          Reject
        </button>
      </div>
      <p className="mt-2 text-xs text-[#6b6778]">Approve: {approveNote}</p>
      <div className="mt-2">
        <ActionMessage msg={msg} />
      </div>
    </Card>
  );
}
