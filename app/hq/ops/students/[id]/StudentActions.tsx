"use client";

import { useState } from "react";
import { opsOverrideCourse, opsResetPin, opsSetClass, opsSetStatus } from "@/app/hq/ops/actions";
import { ActionMessage, Field, Select, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";

export function PinReset({ studentId }: { studentId: string }) {
  const [pin, setPin] = useState("");
  const { pending, msg, run } = useAction();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => opsResetPin(studentId, pin));
      }}
    >
      <Field label="New PIN">
        <TextInput value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" pattern="\d{4}" maxLength={4} className="w-24" />
      </Field>
      <button disabled={pending} className={hqButton("secondary")}>
        Reset PIN
      </button>
      <ActionMessage msg={msg} />
    </form>
  );
}

export function Placement({ studentId, classGrade, contentLevel }: { studentId: string; classGrade: number; contentLevel: number }) {
  const [c, setC] = useState(classGrade);
  const [l, setL] = useState(contentLevel);
  const [reason, setReason] = useState("");
  const { pending, msg, run } = useAction();
  return (
    <form
      className="grid gap-2 sm:grid-cols-[100px_120px_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => opsSetClass(studentId, c, l, reason));
      }}
    >
      <Field label="Class">
        <Select value={c} onChange={(e) => setC(Number(e.target.value))}>
          {[6, 7, 8, 9, 10, 11, 12].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Course level">
        <Select value={l} onChange={(e) => setL(Number(e.target.value))}>
          {[1, 2, 3].map((x) => (
            <option key={x} value={x}>
              Level {x}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Reason (for the audit log)">
        <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. promoted to class 9" />
      </Field>
      <button disabled={pending} className={hqButton("secondary")}>
        Update
      </button>
      <span className="sm:col-span-4">
        <ActionMessage msg={msg} />
      </span>
    </form>
  );
}

export function StatusToggle({ studentId, status }: { studentId: string; status: string }) {
  const [reason, setReason] = useState("");
  const { pending, msg, run } = useAction();
  const next = status === "paused" ? "active" : "paused";
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => opsSetStatus(studentId, next, reason));
      }}
    >
      <Field label="Reason">
        <TextInput value={reason} onChange={(e) => setReason(e.target.value)} className="w-64" />
      </Field>
      <button disabled={pending} className={hqButton(next === "paused" ? "danger" : "secondary")}>
        {next === "paused" ? "Pause profile" : "Make active"}
      </button>
      <ActionMessage msg={msg} />
    </form>
  );
}

export function CourseOverride({ studentId, courseId, title, state }: { studentId: string; courseId: string; title: string; state: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, msg, run } = useAction();
  if (!open) {
    return (
      <button type="button" className={hqButton("ghost", "h-7 text-xs")} onClick={() => setOpen(true)}>
        Override
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-[#e4e2ea] bg-[#fafafb] p-2">
      <TextInput aria-label={`Reason for overriding ${title}`} placeholder="Reason (required, audited)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {(state === "locked" || state === "preview") && (
          <button type="button" disabled={pending} className={hqButton("secondary", "h-8")} onClick={() => run(() => opsOverrideCourse(studentId, courseId, "unlock", reason))}>
            Unlock
          </button>
        )}
        {state !== "locked" && (
          <button
            type="button"
            disabled={pending}
            className={hqButton("danger", "h-8")}
            onClick={() => window.confirm(`Reset ${title}? The student starts this course again.`) && run(() => opsOverrideCourse(studentId, courseId, "reset", reason))}
          >
            Reset progress
          </button>
        )}
        <button type="button" className={hqButton("ghost", "h-8")} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <ActionMessage msg={msg} />
    </div>
  );
}
