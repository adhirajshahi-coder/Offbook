"use client";

import { useState } from "react";
import { ActionMessage, useAction } from "@/components/hq/forms";
import { hqButton, hqInput, hqTextarea } from "@/components/hq/ui";
import { cn } from "@/lib/utils";
import { addActivity, completeActivity } from "./actions";

const TYPES = [
  { key: "note", label: "Note" },
  { key: "task", label: "Task" },
  { key: "call", label: "Call" },
  { key: "meeting", label: "Meeting" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
] as const;

type Links = { deal_id?: string; contact_id?: string; organization_id?: string; family_parent_id?: string };

/** Log what happened, or schedule what's next (PRD §12.2: every open deal needs a next activity). */
export function ActivityComposer({ links, owners, defaultOwner }: { links: Links; owners: { id: string; name: string }[]; defaultOwner: string }) {
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [owner, setOwner] = useState(defaultOwner);
  const { pending, msg, run } = useAction();
  const scheduled = type !== "note" && !isDone;

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const r = await addActivity({
            type,
            subject,
            body,
            due_at: scheduled && due ? `${due}:00+05:30` : "",
            done: type === "note" || isDone,
            owner_id: owner,
            ...links,
          });
          if (r.ok) {
            setSubject("");
            setBody("");
            setDue("");
          }
          return r;
        });
      }}
    >
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Activity type">
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={type === t.key}
            onClick={() => setType(t.key)}
            className={cn("h-7 rounded-md px-2 text-xs font-semibold", type === t.key ? "bg-violet-600 text-white" : "border border-[#d9d6e2] bg-white")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input className={hqInput} placeholder={type === "note" ? "Summary" : type === "task" ? "What needs doing?" : "Subject"} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required aria-label="Subject" />
      <textarea className={hqTextarea} rows={2} placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} aria-label="Details" />
      {type !== "note" && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={isDone} onChange={(e) => setIsDone(e.target.checked)} />
            Already done
          </label>
          {scheduled && (
            <label className="flex items-center gap-1.5">
              Due (IST)
              <input type="datetime-local" className={cn(hqInput, "h-8 w-auto")} value={due} onChange={(e) => setDue(e.target.value)} required />
            </label>
          )}
          <label className="flex items-center gap-1.5">
            Owner
            <select className={cn(hqInput, "h-8 w-auto")} value={owner} onChange={(e) => setOwner(e.target.value)}>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={hqButton("primary")}>
          {type === "note" ? "Add note" : scheduled ? "Schedule" : "Log it"}
        </button>
        <ActionMessage msg={msg} />
      </div>
    </form>
  );
}

export function CompleteButton({ id, done }: { id: string; done: boolean }) {
  const { pending, run } = useAction();
  return (
    <button type="button" disabled={pending} onClick={() => run(() => completeActivity(id, done))} className={hqButton("ghost", "h-7 px-2 text-xs")}>
      {done ? "Reopen" : "Mark done"}
    </button>
  );
}
