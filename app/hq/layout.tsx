import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { CubeMark } from "@/components/brand/Logo";
import { CommandPalette } from "@/components/hq/CommandPalette";
import { hqButton } from "@/components/hq/ui";
import { requireStaff, type StaffRole } from "@/lib/auth";

// Module groups from PRD §10.1. Each lists the roles that can open it;
// admins see everything. Pages enforce the same roles server-side and RLS
// enforces them in Postgres. Hiding links here is only convenience.
type NavItem = { label: string; href: string; roles: StaffRole[]; children?: { label: string; href: string; roles?: StaffRole[] }[] };

const NAV: NavItem[] = [
  {
    label: "Content",
    href: "/hq/content",
    roles: ["content", "teacher"],
    children: [
      { label: "Courses", href: "/hq/content", roles: ["content"] },
      { label: "Questions", href: "/hq/content/questions", roles: ["content"] },
      { label: "Skills", href: "/hq/content/skills", roles: ["content"] },
      { label: "Games", href: "/hq/content/games", roles: ["content"] },
      { label: "Challenges", href: "/hq/content/challenges", roles: ["content"] },
      { label: "Videos", href: "/hq/content/videos" },
    ],
  },
  {
    label: "Operations",
    href: "/hq/ops",
    roles: ["ops", "reviewer"],
    children: [
      { label: "Students", href: "/hq/ops/students", roles: ["ops"] },
      { label: "Subscriptions", href: "/hq/ops/subscriptions", roles: ["ops"] },
    ],
  },
  { label: "Review queue", href: "/hq/review", roles: ["reviewer", "ops"] },
  {
    label: "CRM",
    href: "/hq/crm",
    roles: ["sales", "marketing", "ops", "viewer"],
    children: [
      { label: "My day", href: "/hq/crm", roles: ["sales", "marketing"] },
      { label: "Schools pipeline", href: "/hq/crm/pipeline/schools" },
      { label: "Families pipeline", href: "/hq/crm/pipeline/families" },
      { label: "Organizations", href: "/hq/crm/organizations" },
      { label: "Contacts", href: "/hq/crm/contacts" },
      { label: "Families", href: "/hq/crm/families" },
      { label: "Campaigns and referrals", href: "/hq/crm/campaigns", roles: ["sales", "marketing", "viewer"] },
      { label: "Import", href: "/hq/crm/import", roles: ["sales", "marketing"] },
    ],
  },
  { label: "Reports", href: "/hq/reports", roles: ["sales", "marketing", "ops", "viewer"] },
  {
    label: "Settings",
    href: "/hq/settings",
    roles: [],
    children: [
      { label: "Team", href: "/hq/settings/team" },
      { label: "Audit log", href: "/hq/settings/audit" },
      { label: "Pipelines", href: "/hq/settings/pipelines" },
      { label: "Custom fields", href: "/hq/settings/fields" },
      { label: "System", href: "/hq/settings/system" },
      { label: "Email templates", href: "/hq/settings/emails" },
    ],
  },
];

function allowed(role: StaffRole, roles?: StaffRole[]) {
  return role === "admin" || !roles || roles.includes(role);
}

export default async function HqLayout({ children }: LayoutProps<"/hq">) {
  const staff = await requireStaff();
  const visible = NAV.filter((n) => allowed(staff.role, n.roles)).map((n) => ({
    ...n,
    children: n.children?.filter((c) => allowed(staff.role, c.roles ?? n.roles)),
  }));
  const pages = visible.flatMap((n) => (n.children?.length ? n.children.map((c) => ({ label: `${n.label}: ${c.label}`, href: c.href })) : [{ label: n.label, href: n.href }]));

  const nav = (
    <nav aria-label="HQ modules" className="flex flex-col gap-3">
      {visible.map((n) => (
        <div key={n.href}>
          {n.children?.length ? (
            <>
              <p className="px-2 pb-1 text-xs font-semibold text-[#6b6778]">{n.label}</p>
              {n.children.map((c) => (
                <Link key={c.href} href={c.href} className="block rounded-md px-2 py-1.5 hover:bg-[#efedf5]">
                  {c.label}
                </Link>
              ))}
            </>
          ) : (
            <Link href={n.href} className="block rounded-md px-2 py-1.5 hover:bg-[#efedf5]">
              {n.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-1 bg-[#f7f6fa] text-sm text-ink">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[#e4e2ea] bg-[#fafafb] p-3 md:flex">
        <Link href="/hq" className="mb-6 flex items-center gap-2 px-2 py-1">
          <CubeMark className="h-6 w-auto" />
          <span className="font-display text-base font-black">Offbook HQ</span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-[#e4e2ea] pt-3">
          <p className="px-2 font-semibold">{staff.name}</p>
          <p className="px-2 text-xs text-[#6b6778]">{staff.role}</p>
          <form action={signOut} className="mt-2">
            <button type="submit" className={hqButton("ghost", "w-full justify-start px-2")}>
              Log out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-[#e4e2ea] bg-white px-4 py-2">
          <details className="relative md:hidden">
            <summary className={hqButton("secondary", "list-none marker:hidden")}>Menu</summary>
            <div className="absolute left-0 z-30 mt-2 w-60 rounded-lg border border-[#e4e2ea] bg-white p-3 shadow-lg">{nav}</div>
          </details>
          <CommandPalette pages={pages} />
        </div>
        <main className="min-w-0 flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
