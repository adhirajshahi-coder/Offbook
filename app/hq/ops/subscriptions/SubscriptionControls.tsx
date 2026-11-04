"use client";

import { useState } from "react";
import { opsDecideRefund, opsExtendSubscription, opsMarkRefundProcessed } from "@/app/hq/ops/actions";
import { ActionMessage, TextInput, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";

export function RefundDecision({ refundId }: { refundId: string }) {
  const [note, setNote] = useState("");
  const { pending, msg, run } = useAction();
  return (
    <div className="flex flex-col gap-2">
      <TextInput aria-label="Note to the parent" placeholder="Note to the parent (needed if declining)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} className={hqButton("primary", "h-8")} onClick={() => window.confirm("Approve and refund this payment? The plan ends now.") && run(() => opsDecideRefund(refundId, "approve", note))}>
          Approve refund
        </button>
        <button type="button" disabled={pending} className={hqButton("danger", "h-8")} onClick={() => run(() => opsDecideRefund(refundId, "reject", note))}>
          Decline
        </button>
      </div>
      <ActionMessage msg={msg} />
    </div>
  );
}

export function MarkProcessed({ refundId }: { refundId: string }) {
  const { pending, msg, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} className={hqButton("secondary", "h-8")} onClick={() => run(() => opsMarkRefundProcessed(refundId))}>
        Mark refunded
      </button>
      <ActionMessage msg={msg} />
    </span>
  );
}

export function Extend({ subscriptionId }: { subscriptionId: string }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const { pending, msg, run } = useAction();
  if (!open)
    return (
      <button type="button" className={hqButton("ghost", "h-7 text-xs")} onClick={() => setOpen(true)}>
        Extend
      </button>
    );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <TextInput aria-label="Days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-20" />
        <TextInput aria-label="Reason" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="button" disabled={pending} className={hqButton("secondary")} onClick={() => run(() => opsExtendSubscription(subscriptionId, days, reason))}>
          Save
        </button>
      </div>
      <ActionMessage msg={msg} />
    </div>
  );
}
