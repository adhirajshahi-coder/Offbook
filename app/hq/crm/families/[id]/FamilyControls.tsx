"use client";

import { useState } from "react";
import { ActionMessage, useAction } from "@/components/hq/forms";
import { hqButton, hqInput } from "@/components/hq/ui";
import { cn } from "@/lib/utils";
import { updateFamily } from "../../actions";

export function FamilyControls({ parentId, ownerId, atRisk, owners, canEdit }: { parentId: string; ownerId: string; atRisk: boolean; owners: { id: string; name: string }[]; canEdit: boolean }) {
  const [owner, setOwner] = useState(ownerId);
  const [risk, setRisk] = useState(atRisk);
  const { pending, msg, run } = useAction();
  return (
    <form
      className="flex flex-wrap items-end gap-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateFamily(parentId, { owner_id: owner || null, at_risk: risk }));
      }}
    >
      <fieldset disabled={!canEdit} className="contents">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#4f4b5c]">
          Owner
          <select className={cn(hqInput, "w-48")} value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2">
          <input type="checkbox" checked={risk} onChange={(e) => setRisk(e.target.checked)} />
          At risk
        </label>
        {canEdit && (
          <button type="submit" disabled={pending} className={hqButton("secondary")}>
            Save
          </button>
        )}
        <ActionMessage msg={msg} />
      </fieldset>
    </form>
  );
}
