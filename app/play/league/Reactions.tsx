"use client";

import { useState } from "react";
import { STICKER_EMOJI, STICKERS, type Sticker } from "@/lib/play/league-stickers";
import { react } from "./actions";

export function Reactions({ toStudentId, counts, sent, self }: { toStudentId: string; counts: Partial<Record<Sticker, number>>; sent: Sticker[]; self: boolean }) {
  const [c, setC] = useState(counts);
  const [mine, setMine] = useState(sent);
  const [open, setOpen] = useState(false);
  const shown = STICKERS.filter((s) => c[s]);

  return (
    <span className="relative flex items-center gap-1">
      {shown.map((s) => (
        <span key={s} className="text-sm" aria-label={`${c[s]} ${s}`}>
          {STICKER_EMOJI[s]}
          <span className="text-xs text-muted">{c[s]}</span>
        </span>
      ))}
      {!self && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-sm" aria-expanded={open} aria-label="Send a sticker">
            ＋
          </button>
          {open && (
            <span className="absolute right-0 top-9 z-10 flex gap-1 rounded-band border border-line bg-surface p-1 shadow">
              {STICKERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={mine.includes(s)}
                  aria-label={`Send ${s}`}
                  className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-surface-2 disabled:opacity-40"
                  onClick={async () => {
                    setOpen(false);
                    setMine((m) => [...m, s]);
                    setC((x) => ({ ...x, [s]: (x[s] ?? 0) + 1 }));
                    const r = await react(toStudentId, s);
                    if (!r.ok) {
                      setMine((m) => m.filter((y) => y !== s));
                      setC((x) => ({ ...x, [s]: Math.max(0, (x[s] ?? 1) - 1) }));
                    }
                  }}
                >
                  {STICKER_EMOJI[s]}
                </button>
              ))}
            </span>
          )}
        </>
      )}
    </span>
  );
}
