"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/play", label: "Today" },
  { href: "/play/journey", label: "Journey" },
  { href: "/play/games", label: "Games" },
  { href: "/play/challenges", label: "Challenges" },
  { href: "/play/me", label: "Me" },
];

/** Bottom tab bar on mobile, left rail on desktop (PRD §7.2). */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Play"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:static md:inset-auto md:w-48 md:shrink-0 md:border-r md:border-t-0 md:bg-transparent"
    >
      <ul className="mx-auto flex max-w-2xl justify-around md:sticky md:top-4 md:flex-col md:gap-1 md:p-3">
        {TABS.map((t) => {
          const active = t.href === "/play" ? pathname === "/play" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1 md:flex-none">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center justify-center text-sm font-semibold md:min-h-11 md:justify-start md:rounded-band md:px-4",
                  active ? "text-accent md:bg-surface md:text-text" : "text-muted hover:text-text",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function WithTabs({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <TabBar />
      <div className="flex-1 pb-20 md:pb-0">{children}</div>
    </div>
  );
}
