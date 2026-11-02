"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestRefund, type RefundState } from "./actions";

export function RefundForm({ subscriptionId, days }: { subscriptionId: string; days: number }) {
  const [state, action, pending] = useActionState<RefundState, FormData>(requestRefund, {});
  if (state.message) {
    return (
      <p role="status" className="text-sm font-medium text-[#0b7a57]">
        {state.message}
      </p>
    );
  }
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-violet-600">Ask for a refund</summary>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <p className="text-sm text-muted">
          Within {days} days of paying you get a full refund, no questions asked. Telling us why is optional
          but helps us improve.
        </p>
        <label htmlFor={`reason-${subscriptionId}`} className="sr-only">
          Reason (optional)
        </label>
        <textarea
          id={`reason-${subscriptionId}`}
          name="reason"
          rows={2}
          maxLength={1000}
          placeholder="Optional"
          className="rounded-band border border-line bg-white px-3 py-2 text-base"
        />
        {state.error && (
          <p role="alert" className="text-sm font-medium text-[#b4233f]">
            {state.error}
          </p>
        )}
        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          Request refund
        </Button>
      </form>
    </details>
  );
}
