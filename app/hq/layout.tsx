import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { CubeMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { requireStaff, type StaffRole } from "@/lib/auth";

// Module groups from PRD §10.1. Each lists the roles that can open it;
// admins see everything. Pages enforce the same roles server-side and RLS
// enforces them in Postgres. Hiding links here is only convenience.
const NAV: { label: string; href: string; roles: StaffRole[] }[] = [
  { label: "CRM", href: "/hq/crm", roles: ["sales", "marketing"] },
  { label: "Marketing", href: "/hq/marketing", roles: ["marketing"] },
  { label: "Content", href: "/hq/content", roles: ["content", "teacher"] },
  { label: "Operations", href: "/hq/ops", roles: ["ops", "reviewer"] },
  { label: "Reports", href: "/hq/reports", roles: ["sales", "marketing", "ops", "viewer"] },
  { label: "Settings", href: "/hq/settings", roles: [] },
];

export default async function HqLayout({ children }: LayoutProps<"/hq">) {
  const staff = await requireStaff();
  const visible = NAV.filter((n) => staff.role === "admin" || n.roles.includes(staff.role));

  return (
    <div className="flex min-h-full flex-1 bg-white text-sm text-ink">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-[#fafafb] p-3 md:flex">
        <Link href="/hq" className="mb-6 flex items-center gap-2 px-2 py-1">
          <CubeMark className="h-6 w-auto" />
          <span className="font-display text-base font-black">Offbook HQ</span>
        </Link>
        <nav aria-label="HQ modules" className="flex flex-col gap-0.5">
          {visible.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-2 py-1.5 hover:bg-[#efedf5]">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-3">
          <p className="px-2 font-semibold">{staff.name}</p>
          <p className="px-2 text-xs text-muted">{staff.role}</p>
          <form action={signOut} className="mt-2">
            <Button type="submit" variant="ghost" className="min-h-9 w-full justify-start px-2 text-sm">
              Log out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
