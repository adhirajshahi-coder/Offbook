import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/button";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label="Offbook home">
            <Wordmark className="h-7 w-auto" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={buttonClass("ghost")}>
              Log in
            </Link>
            <Link href="/signup" className={buttonClass("primary")}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <p>Offbook: school plus real life, for classes 6 to 12.</p>
          <Link href="/styleguide" className="underline underline-offset-4">
            Style guide
          </Link>
        </div>
      </footer>
    </div>
  );
}
