import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/button";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/tracks", label: "Tracks" },
  { href: "/parents", label: "For parents" },
  { href: "/schools", label: "For schools" },
  { href: "/pricing", label: "Pricing" },
];

const FOOTER = [
  { href: "/safety", label: "Safety" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds and cancellation" },
  { href: "/faq", label: "FAQ" },
  { href: "/showcase", label: "Showcase" },
];

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label="Offbook home" className="shrink-0">
            <Wordmark className="h-7 w-auto" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-violet-50">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClass("ghost", "hidden sm:inline-flex")}>
              Log in
            </Link>
            <Link href="/signup" className={buttonClass("primary")}>
              Sign up
            </Link>
            <details className="relative lg:hidden">
              <summary className={buttonClass("secondary", "list-none px-3 marker:hidden")} aria-label="Menu">
                Menu
              </summary>
              <nav
                aria-label="Main"
                className="absolute right-0 mt-2 flex w-56 flex-col rounded-xl border border-line bg-white p-2 shadow-lg"
              >
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 hover:bg-violet-50">
                    {n.label}
                  </Link>
                ))}
                <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-violet-50 sm:hidden">
                  Log in
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-[#fafafb]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_2fr]">
          <div>
            <Wordmark className="h-6 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted">
              School plus real life. Real-world skills for classes 6 to 12.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {FOOTER.map((f) => (
              <Link key={f.href} href={f.href} className="text-muted hover:text-ink">
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
