"use client";

import { ActionMessage, useAction } from "@/components/hq/forms";
import { hqButton } from "@/components/hq/ui";
import { runAutomationsNow } from "./automation-actions";

/** Runs the daily automations now (they're idempotent), e.g. right after a sign-up or payment. */
export function RunAutomationsButton() {
  const { pending, msg, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <ActionMessage msg={msg} />
      <button type="button" disabled={pending} className={hqButton("secondary")} onClick={() => run(runAutomationsNow)}>
        {pending ? "Syncing…" : "Sync from product data"}
      </button>
    </span>
  );
}
