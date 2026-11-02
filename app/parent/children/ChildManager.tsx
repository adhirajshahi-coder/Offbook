"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changeClass, removeChild, resetPin, type ManageState } from "../actions";

type Child = { id: string; display_name: string; class_grade: number };

function Feedback({ state }: { state: ManageState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-medium text-[#b4233f]">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="text-sm font-medium text-[#0b7a57]">
        {state.message}
      </p>
    );
  return null;
}

const inputClass = "min-h-11 rounded-band border border-line bg-surface px-3 text-base";

export function ChildManager({ child }: { child: Child }) {
  const [pinState, pinAction, pinPending] = useActionState<ManageState, FormData>(resetPin, {});
  const [classState, classAction, classPending] = useActionState<ManageState, FormData>(changeClass, {});
  const [removeState, removeAction, removePending] = useActionState<ManageState, FormData>(removeChild, {});

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <form action={pinAction} className="flex flex-col gap-2">
        <input type="hidden" name="studentId" value={child.id} />
        <label htmlFor={`pin-${child.id}`} className="text-sm font-semibold">
          New 4-digit PIN
        </label>
        <div className="flex gap-2">
          <input
            id={`pin-${child.id}`}
            name="pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            autoComplete="off"
            className={`${inputClass} w-28`}
          />
          <Button type="submit" variant="secondary" disabled={pinPending}>
            Save PIN
          </Button>
        </div>
        <Feedback state={pinState} />
      </form>

      <form action={classAction} className="flex flex-col gap-2">
        <input type="hidden" name="studentId" value={child.id} />
        <label htmlFor={`class-${child.id}`} className="text-sm font-semibold">
          Class
        </label>
        <div className="flex gap-2">
          <select id={`class-${child.id}`} name="classGrade" defaultValue={child.class_grade} className={inputClass}>
            {[6, 7, 8, 9, 10, 11, 12].map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" disabled={classPending}>
            Save class
          </Button>
        </div>
        <p className="text-sm text-muted">Progress carries over when your child moves up a class.</p>
        <Feedback state={classState} />
      </form>

      <details className="md:col-span-2">
        <summary className="cursor-pointer text-sm font-semibold text-[#b4233f]">Delete this profile</summary>
        <form action={removeAction} className="mt-3 flex flex-col gap-2 rounded-xl border border-[#f2c2cc] bg-[#fdf1f3] p-4">
          <input type="hidden" name="studentId" value={child.id} />
          <p className="text-sm">
            This removes {child.display_name}&apos;s profile and progress from Offbook. To confirm, type their
            name.
          </p>
          <div className="flex flex-wrap gap-2">
            <label htmlFor={`confirm-${child.id}`} className="sr-only">
              Type {child.display_name} to confirm
            </label>
            <input id={`confirm-${child.id}`} name="confirm" required className={`${inputClass} bg-white`} />
            <Button type="submit" variant="secondary" disabled={removePending}>
              Delete profile
            </Button>
          </div>
          <Feedback state={removeState} />
        </form>
      </details>
    </div>
  );
}
