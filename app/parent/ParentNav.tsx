"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/parent", label: "Overview" },
  { href: "/parent/children", label: "Children" },
  { href: "/parent/billing", label: "Billing" },
  { href: "/parent/consent", label: "Privacy and consent" },
];

export function ParentNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Parent Zone" className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
      {TABS.map((t) => {
        const active = t.href === "/parent" ? pathname === "/parent" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold",
              active ? "border-violet-600 text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
