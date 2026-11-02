import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "HQ" };

export default async function HqHome({ searchParams }: PageProps<"/hq">) {
  const staff = await requireStaff();
  const { denied } = await searchParams;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-black">Good to see you, {staff.name.split(" ")[0]}</h1>
      <p className="mt-1 text-muted">Signed in as {staff.role}.</p>
      {denied && (
        <p role="alert" className="mt-4 rounded-md border border-[#f2c2cc] bg-[#fdf1f3] px-3 py-2">
          Your role can&apos;t open that page. Ask an admin if you need access.
        </p>
      )}
      <p className="mt-6 text-muted">
        CRM, content, operations and reports open up as each build phase lands.
      </p>
    </div>
  );
}
