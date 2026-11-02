"use client";

import { useActionState, useState } from "react";
import { Kube } from "@/components/kid/Kube";
import { Button } from "@/components/ui/button";
import { enterProfile, type PinState } from "./actions";

type Profile = { id: string; display_name: string; class_grade: number };

export function ProfilePicker({ profiles }: { profiles: Profile[] }) {
  const [selected, setSelected] = useState<Profile | null>(
    profiles.length === 1 ? profiles[0] : null,
  );
  const [state, action, pending] = useActionState<PinState, FormData>(enterProfile, {});

  if (!selected) {
    return (
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-3xl font-black">Who&apos;s playing?</h1>
        <ul className="flex flex-wrap justify-center gap-6">
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelected(p)}
                className="flex w-36 flex-col items-center gap-3 rounded-band border border-line bg-surface p-4 hover:border-accent"
              >
                <Kube size={72} animate={false} label="" />
                <span className="font-semibold">{p.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-xs flex-col items-center gap-5">
      <Kube expression={state.error ? "oops" : "happy"} size={96} />
      <h1 className="text-2xl font-black">Hi {selected.display_name}! Enter your PIN</h1>
      <input type="hidden" name="studentId" value={selected.id} />
      <label htmlFor="pin" className="sr-only">
        4-digit PIN
      </label>
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        required
        autoFocus
        autoComplete="off"
        className="w-40 rounded-band border border-line bg-surface py-3 text-center text-3xl tracking-[0.5em] text-text"
      />
      {state.error && (
        <p className="text-center text-sm font-medium" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Let's go"}
      </Button>
      {profiles.length > 1 && (
        <button type="button" onClick={() => setSelected(null)} className="text-sm text-muted underline">
          Not {selected.display_name}? Switch profile
        </button>
      )}
    </form>
  );
}
