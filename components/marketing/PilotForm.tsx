"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { submitLead, type LeadState } from "@/app/(marketing)/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];

export function PilotForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, {});

  if (state.ok) {
    return (
      <div role="status" className="rounded-[18px] border border-line bg-white p-6">
        <p className="font-display text-xl font-black">Thanks, we&apos;ve got it.</p>
        <p className="mt-2 text-muted">Someone from our team will call or email you within one working day.</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 rounded-[18px] border border-line bg-white p-6 sm:grid-cols-2">
      <input type="hidden" name="kind" value="school_pilot" />
      {UTM_KEYS.map((k) => {
        const v = params.get(k);
        return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
      })}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Your name" name="name" required autoComplete="name" />
      <Field label="Your role" name="role" placeholder="Principal, coordinator…" />
      <Field label="School name" name="organization" required />
      <Field label="City" name="city" autoComplete="address-level2" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="pilot-message" className="text-sm font-semibold">
          Anything we should know? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="pilot-message"
          name="message"
          rows={3}
          maxLength={2000}
          className="rounded-band border border-line bg-surface px-3 py-2 text-base"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-[#b4233f] sm:col-span-2">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Sending…" : "Book a pilot"}
      </Button>
    </form>
  );
}
