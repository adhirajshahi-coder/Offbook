"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { hqSearch, type SearchHit } from "@/app/hq/search-actions";

/** Cmd/Ctrl+K to jump to any page or record (PRD §10.1). */
export function CommandPalette({ pages }: { pages: { label: string; href: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [, startSearch] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => startSearch(async () => setHits(await hqSearch(query))), 200);
    return () => clearTimeout(t);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center justify-between rounded-md border border-[#d9d6e2] bg-white px-3 text-sm text-[#6b6778] hover:bg-[#fafafb]"
      >
        <span>Search or jump to…</span>
        <kbd className="rounded border border-[#e4e2ea] px-1.5 text-xs">Ctrl K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Search HQ"
        shouldFilter={false}
        className="fixed left-1/2 top-24 z-50 w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-[#e4e2ea] bg-white shadow-2xl"
        overlayClassName="fixed inset-0 z-40 bg-black/20"
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search courses, lessons, students, videos…"
          className="h-12 w-full border-b border-[#eeecf2] px-4 text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2 text-sm">
          <Command.Empty className="px-3 py-6 text-center text-[#6b6778]">No matches.</Command.Empty>
          <Command.Group heading="Pages" className="text-xs text-[#6b6778] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
            {pages
              .filter((p) => !query || p.label.toLowerCase().includes(query.toLowerCase()))
              .map((p) => (
                <Command.Item key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)} className="cursor-pointer rounded-md px-3 py-2 text-sm text-ink aria-selected:bg-[#f4f2f8]">
                  {p.label}
                </Command.Item>
              ))}
          </Command.Group>
          {query.trim().length >= 2 &&
            groups.map((g) => (
              <Command.Group key={g} heading={g} className="text-xs text-[#6b6778] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
                {hits
                  .filter((h) => h.group === g)
                  .map((h) => (
                    <Command.Item key={h.href} value={h.href} onSelect={() => go(h.href)} className="flex cursor-pointer items-baseline justify-between gap-3 rounded-md px-3 py-2 text-sm text-ink aria-selected:bg-[#f4f2f8]">
                      <span>{h.label}</span>
                      {h.detail && <span className="text-xs text-[#6b6778]">{h.detail}</span>}
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
