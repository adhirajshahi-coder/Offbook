"use client";

import { useState, useTransition } from "react";
import { setLeagueOptIn } from "./actions";

export function LeagueToggle({ studentId, childName, on }: { studentId: string; childName: string; on: boolean }) {
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-2 rounded-[14px] border border-line bg-white p-4 text-sm">
      <input
        type="checkbox"
        className="mt-1"
        checked={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setValue(next);
          start(async () => {
            const r = await setLeagueOptIn(studentId, next);
            if (!r.ok) setValue(!next);
          });
        }}
      />
      <span>
        <strong>{childName}</strong> joins weekly leagues
        <span className="block text-muted">Ranked by XP against 20–30 learners in the same class band. Others see only a first name; reactions are preset stickers, no messages.</span>
      </span>
    </label>
  );
}
