"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { addChild, type AddChildState } from "./actions";

export function AddChildForm() {
  const [state, action, pending] = useActionState<AddChildState, FormData>(addChild, {});

  return (
    <form action={action} className="flex flex-col gap-4" key={state.ok ? "saved" : "form"}>
      <Field
        label="First name or nickname"
        name="displayName"
        required
        maxLength={24}
        hint="No surnames. This is what friends see in leagues."
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="classGrade" className="text-sm font-semibold">
          Class
        </label>
        <select
          id="classGrade"
          name="classGrade"
          required
          defaultValue=""
          className="min-h-11 rounded-band border border-line bg-surface px-3 text-base"
        >
          <option value="" disabled>
            Choose a class
          </option>
          {[6, 7, 8, 9, 10, 11, 12].map((c) => (
            <option key={c} value={c}>
              Class {c}
            </option>
          ))}
        </select>
      </div>
      <Field
        label="4-digit PIN"
        name="pin"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        required
        autoComplete="off"
        hint="Your child uses this to open their profile on this device."
      />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-1 size-4 accent-[var(--accent)]" />
        <span>
          I&apos;m this child&apos;s parent or guardian, and I agree to Offbook storing their first
          name, class and learning progress as described in the privacy notice.
        </span>
      </label>
      {state.error && (
        <p className="text-sm font-medium text-[#b4233f]" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-medium text-[#0b7a57]" role="status">
          Profile added.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add child"}
      </Button>
    </form>
  );
}
