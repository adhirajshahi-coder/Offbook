import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Wordmark } from "@/components/brand/Logo";
import { Button, buttonClass } from "@/components/ui/button";
import { requireParent } from "@/lib/auth";
import { ParentNav } from "./ParentNav";

export default async function ParentLayout({ children }: LayoutProps<"/parent">) {
  await requireParent();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f6f5f9]">
      <header className="border-b border-line bg-white print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/parent" aria-label="Parent Zone home" className="flex items-center gap-3">
            <Wordmark className="h-6 w-auto" />
            <span className="hidden text-sm font-semibold text-muted sm:inline">Parent Zone</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/play" className={buttonClass("secondary")}>
              Open Play
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                Log out
              </Button>
            </form>
          </div>
        </div>
        <ParentNav />
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
