"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setItemSharing, setPortfolioHandle } from "./actions";

type Item = {
  id: string;
  title: string;
  source: string;
  visibility: "private" | "portfolio";
  showcase_consent: boolean;
  showcase_status: "none" | "pending" | "approved" | "rejected";
};

const SHOWCASE_NOTE = {
  none: "",
  pending: "Waiting for Offbook to check it",
  approved: "On the Showcase",
  rejected: "Not chosen for the Showcase this time",
};

export function SharingControls({ studentId, childName, handle, items }: { studentId: string; childName: string; handle: string | null; items: Item[] }) {
  const [value, setValue] = useState(handle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      <h3 className="text-lg font-bold">{childName}</h3>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await setPortfolioHandle(studentId, value);
            setError(r.ok ? null : (r.error ?? "Couldn't save that."));
          });
        }}
      >
        <label htmlFor={`handle-${studentId}`} className="text-sm font-semibold">
          Public portfolio link
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">offbook.in/p/</span>
          <input
            id={`handle-${studentId}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="off (leave empty)"
            maxLength={30}
            className="min-h-10 w-48 rounded-[10px] border border-line px-2 text-sm"
          />
          <Button type="submit" variant="secondary" disabled={pending}>
            {value ? "Save link" : "Turn off"}
          </Button>
          {handle && (
            <Link href={`/p/${handle}`} className="text-sm underline underline-offset-4" target="_blank">
              Open page
            </Link>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">Off by default. Use a nickname, not a full name. The page shows a first name, class band and only the items you tick below. Search engines are asked not to list it.</p>
        {error && (
          <p role="alert" className="mt-1 text-sm text-coral">
            {error}
          </p>
        )}
      </form>

      {items.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} canShare={Boolean(handle)} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">Finished capstones and challenges will appear here.</p>
      )}
    </div>
  );
}

function ItemRow({ item, canShare }: { item: Item; canShare: boolean }) {
  const [v, setV] = useState({ visibility: item.visibility, showcaseConsent: item.showcase_consent });
  const [pending, start] = useTransition();
  const save = (next: typeof v) => {
    setV(next);
    start(async () => {
      await setItemSharing(item.id, next);
    });
  };

  return (
    <li className="rounded-[10px] border border-line p-3 text-sm">
      <p className="font-semibold">
        {item.title} <span className="font-normal text-muted">· {item.source}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled={pending} checked={v.visibility === "portfolio"} onChange={(e) => save({ ...v, visibility: e.target.checked ? "portfolio" : "private" })} />
          Show on the public portfolio{!canShare && " (set a link first)"}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" disabled={pending} checked={v.showcaseConsent} onChange={(e) => save({ ...v, showcaseConsent: e.target.checked })} />
          Offer to the Offbook Showcase
        </label>
      </div>
      {v.showcaseConsent && SHOWCASE_NOTE[item.showcase_status] && <p className="mt-1 text-xs text-muted">{SHOWCASE_NOTE[item.showcase_status]}</p>}
    </li>
  );
}
