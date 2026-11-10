import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Offbook HQ primitives (PRD §4.8): calm and dense. White surfaces, small
 * type, clear states. shadcn/ui-style, written in place (see D-036).
 */

export const hqInput =
  "h-9 w-full rounded-md border border-[#d9d6e2] bg-white px-2.5 text-sm text-ink placeholder:text-[#8a8697] focus-visible:outline-2 focus-visible:outline-violet-600";
export const hqTextarea =
  "w-full rounded-md border border-[#d9d6e2] bg-white px-2.5 py-2 text-sm text-ink placeholder:text-[#8a8697] focus-visible:outline-2 focus-visible:outline-violet-600";
export const hqLabel = "text-xs font-semibold text-[#4f4b5c]";

export function hqButton(variant: "primary" | "secondary" | "ghost" | "danger" = "secondary", className?: string) {
  return cn(
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-violet-600 text-white hover:bg-violet-700",
    variant === "secondary" && "border border-[#d9d6e2] bg-white text-ink hover:bg-[#f4f2f8]",
    variant === "ghost" && "text-ink hover:bg-[#f4f2f8]",
    variant === "danger" && "border border-[#f2c2cc] bg-white text-[#b4233f] hover:bg-[#fdf1f3]",
    className,
  );
}

export function PageHeader({
  title,
  crumbs = [],
  description,
  actions,
}: {
  title: string;
  crumbs?: { href: string; label: string }[];
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5">
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-1 text-xs text-[#6b6778]">
          {crumbs.map((c, i) => (
            <span key={c.href}>
              <Link href={c.href} className="hover:text-ink hover:underline">
                {c.label}
              </Link>
              {i < crumbs.length - 1 && <span className="mx-1.5">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-[#6b6778]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-[#e4e2ea] bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-[#eeecf2] px-4 py-2.5">
          {title && <h2 className="text-sm font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  published: "bg-[#e5f4e4] text-[#1f6b2a]",
  active: "bg-[#e5f4e4] text-[#1f6b2a]",
  ready: "bg-[#e5f4e4] text-[#1f6b2a]",
  approved: "bg-[#e5f4e4] text-[#1f6b2a]",
  won: "bg-[#e5f4e4] text-[#1f6b2a]",
  open: "bg-[#e7f1fb] text-[#1d5a8f]",
  lost: "bg-[#f0efec] text-[#55524a]",
  processed: "bg-[#e5f4e4] text-[#1f6b2a]",
  completed: "bg-[#e5f4e4] text-[#1f6b2a]",
  draft: "bg-[#f0efec] text-[#55524a]",
  pending: "bg-[#f9eeda] text-[#7a5410]",
  requested: "bg-[#f9eeda] text-[#7a5410]",
  processing: "bg-[#e7f1fb] text-[#1d5a8f]",
  uploading: "bg-[#e7f1fb] text-[#1d5a8f]",
  in_progress: "bg-[#e7f1fb] text-[#1d5a8f]",
  pending_review: "bg-[#f9eeda] text-[#7a5410]",
  archived: "bg-[#f0efec] text-[#55524a]",
  errored: "bg-[#fbebeb] text-[#a02626]",
  rejected: "bg-[#fbebeb] text-[#a02626]",
  refunded: "bg-[#efedff] text-[#4b3aa8]",
  paused: "bg-[#f0efec] text-[#55524a]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[status] ?? "bg-[#f0efec] text-[#55524a]")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-[#d9d6e2] px-3 py-6 text-center text-sm text-[#6b6778]">{children}</p>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        tone === "info" && "border-[#cfe2f5] bg-[#e7f1fb]",
        tone === "warn" && "border-[#f0dcae] bg-[#f9eeda]",
        tone === "error" && "border-[#f2c2cc] bg-[#fdf1f3]",
        tone === "ok" && "border-[#c6e8c4] bg-[#e5f4e4]",
      )}
    >
      {children}
    </div>
  );
}
