"use client";

import { useState, useTransition } from "react";
import { Kube } from "@/components/kid/Kube";
import type { KubeStage } from "@/components/kid/kube-types";
import { cn } from "@/lib/utils";
import { buyItem, equipItem } from "./locker-actions";

type Item = { slug: string; name: string; kind: "accessory" | "color"; asset: string; price: number; minLevel: number; owned: boolean; equipped: boolean };

/** Kube customiser and shop (PRD §7.10). Coins from XP; cosmetics only. */
export function Locker({ items: initial, coins: initialCoins, level, stage }: { items: Item[]; coins: number; level: number; stage: KubeStage }) {
  const [items, setItems] = useState(initial);
  const [coins, setCoins] = useState(initialCoins);
  const [preview, setPreview] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const wearing = (kind: Item["kind"]) => items.find((i) => i.kind === kind && i.equipped);
  const show = (kind: Item["kind"]) => (preview?.kind === kind ? preview.asset : (wearing(kind)?.asset ?? null));

  function act(item: Item) {
    setError(null);
    start(async () => {
      if (!item.owned) {
        const r = await buyItem(item.slug);
        if (!r.ok) return setError(r.error ?? "That didn't go through.");
        setCoins((c) => c - item.price);
        setItems((xs) => xs.map((x) => (x.slug === item.slug ? { ...x, owned: true, equipped: true } : x.kind === item.kind ? { ...x, equipped: false } : x)));
      } else {
        const r = await equipItem(item.kind, item.equipped ? null : item.slug);
        if (!r.ok) return setError(r.error ?? "That didn't go through.");
        setItems((xs) => xs.map((x) => (x.kind !== item.kind ? x : { ...x, equipped: x.slug === item.slug ? !item.equipped : false })));
      }
      setPreview(null);
    });
  }

  return (
    <section className="rounded-band border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-black">Locker</h2>
        <p className="rounded-full bg-sun px-3 py-1 text-sm font-bold text-ink" aria-live="polite">
          🪙 {coins} coins
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">Earn 1 coin for every 10 XP. Dress up Kube; it&apos;s just for fun.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="flex flex-col items-center gap-1">
          <Kube stage={stage} accessory={show("accessory")} color={show("color")} size={130} label="Your Kube" />
          {preview && <p className="text-xs text-muted">Trying on: {preview.name}</p>}
        </div>
        <div className="space-y-4">
          {(["accessory", "color"] as const).map((kind) => (
            <div key={kind}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{kind === "accessory" ? "Accessories" : "Colours"}</h3>
              <ul className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                {items
                  .filter((i) => i.kind === kind)
                  .map((i) => {
                    const locked = level < i.minLevel;
                    const short = !i.owned && coins < i.price;
                    return (
                      <li key={i.slug}>
                        <div className={cn("flex h-full flex-col gap-1 rounded-band border-2 bg-bg p-2 text-sm", i.equipped ? "border-accent" : "border-line")} onMouseEnter={() => setPreview(i)} onMouseLeave={() => setPreview(null)}>
                          <span className="font-semibold">{i.name}</span>
                          <span className="text-xs text-muted">{i.owned ? (i.equipped ? "Wearing" : "Owned") : locked ? `Level ${i.minLevel}` : `🪙 ${i.price}`}</span>
                          <div className="mt-auto flex gap-1">
                            <button type="button" className="rounded-full border border-line px-2 py-0.5 text-xs" onClick={() => setPreview(preview?.slug === i.slug ? null : i)} aria-pressed={preview?.slug === i.slug}>
                              Try on
                            </button>
                            <button
                              type="button"
                              disabled={pending || locked || short}
                              onClick={() => act(i)}
                              className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent disabled:opacity-50"
                            >
                              {i.owned ? (i.equipped ? "Take off" : "Wear") : "Buy"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
          {error && (
            <p role="alert" className="text-sm text-coral">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
