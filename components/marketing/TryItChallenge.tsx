"use client";

import Link from "next/link";
import { useState } from "react";
import { Kube } from "@/components/kid/Kube";
import type { KubeExpression } from "@/components/kid/kube-types";
import { buttonClass } from "@/components/ui/button";

// A 30-second taste of a Money Mint lesson for the home page (PRD §15).
// Marketing copy, not course content, so it lives here rather than the DB.

type Choice = { label: string; cost: number; smart: boolean; why: string };
type Round = { prompt: string; choices: Choice[] };

const START = 500;

const ROUNDS: Round[] = [
  {
    prompt: "Your friend's birthday is on Saturday.",
    choices: [
      { label: "Buy a ₹300 gift", cost: 300, smart: false, why: "Kind, but that's most of your month gone on day one." },
      { label: "₹120 gift and a handmade card", cost: 120, smart: true, why: "Thoughtful and affordable. The card is what they'll keep." },
      { label: "Skip it this time", cost: 0, smart: false, why: "Saves money, but some things are worth spending on." },
    ],
  },
  {
    prompt: "Your phone data runs out halfway through the month.",
    choices: [
      { label: "₹299 big pack", cost: 299, smart: false, why: "More data than you need, at more than half your money." },
      { label: "₹149 pack that lasts to month end", cost: 149, smart: true, why: "Matches what you actually use. That's a budget working." },
      { label: "Ask to use a friend's hotspot every day", cost: 0, smart: false, why: "Free for you, but it costs your friend." },
    ],
  },
  {
    prompt: "Headphones on sale: ₹999, now ₹449. Only today!",
    choices: [
      { label: "Buy now before it ends", cost: 449, smart: false, why: "\"Only today\" is a trick to rush you. There's always another sale." },
      { label: "Wait a week, then decide", cost: 0, smart: true, why: "If you still want them in a week, it's a real want, not a rush." },
      { label: "Save ₹100 a week towards them", cost: 100, smart: true, why: "Planning for a want instead of grabbing it. Nice." },
    ],
  },
];

export function TryItChallenge() {
  const [round, setRound] = useState(0);
  const [money, setMoney] = useState(START);
  const [smart, setSmart] = useState(0);
  const [picked, setPicked] = useState<Choice | null>(null);

  const done = round >= ROUNDS.length;
  const current = ROUNDS[round];

  function choose(choice: Choice) {
    if (picked || choice.cost > money) return;
    setPicked(choice);
    setMoney((m) => m - choice.cost);
    if (choice.smart) setSmart((s) => s + 1);
  }

  function next() {
    setPicked(null);
    setRound((r) => r + 1);
  }

  function restart() {
    setRound(0);
    setMoney(START);
    setSmart(0);
    setPicked(null);
  }

  const mood: KubeExpression = done ? (smart >= 2 ? "celebrate" : "happy") : picked ? (picked.smart ? "happy" : "oops") : "thinking";

  return (
    <div data-band="explore" className="rounded-[22px] border border-line bg-surface p-5 text-text shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">Try it: Money Mint</p>
          <p className="font-display text-xl font-black">Spend ₹500 wisely</p>
        </div>
        <div className="rounded-full bg-sun px-3 py-1 text-sm font-bold text-ink" aria-live="polite">
          ₹{money} left
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Kube expression={mood} size={64} label="" />
        <div className="flex-1" aria-live="polite">
          {done ? (
            <div className="space-y-3">
              <p className="text-lg font-semibold">
                You kept ₹{money} and made {smart} smart {smart === 1 ? "call" : "calls"}.
              </p>
              <p className="text-muted">
                That&apos;s one tiny lesson. Offbook has hundreds: money, talking to people, AI,
                running a mini business and more.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/signup" className={buttonClass("primary")}>
                  Start for real
                </Link>
                <button onClick={restart} className={buttonClass("secondary")}>
                  Play again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Round {round + 1} of {ROUNDS.length}
              </p>
              <p className="text-lg font-semibold">{current.prompt}</p>
              <ul className="flex flex-col gap-2">
                {current.choices.map((c) => {
                  const isPicked = picked === c;
                  const tooMuch = c.cost > money;
                  return (
                    <li key={c.label}>
                      <button
                        onClick={() => choose(c)}
                        disabled={Boolean(picked) || tooMuch}
                        className={`w-full rounded-band border px-4 py-3 text-left font-medium transition-colors ${
                          isPicked
                            ? c.smart
                              ? "border-mint bg-mint/20"
                              : "border-coral bg-coral/15"
                            : "border-line bg-surface hover:border-accent disabled:opacity-60"
                        }`}
                      >
                        {c.label}
                        {tooMuch && !picked && <span className="ml-2 text-sm text-muted">(not enough left)</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {picked && (
                <div className="space-y-2">
                  <p className="font-semibold">{picked.smart ? "Smart call!" : "Oops, good try."}</p>
                  <p className="text-muted">{picked.why}</p>
                  <button onClick={next} className={buttonClass("primary")}>
                    {round + 1 < ROUNDS.length ? "Next round" : "See how you did"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
