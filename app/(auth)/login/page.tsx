import type { Metadata } from "next";
import Link from "next/link";
import { SetupNotice } from "@/components/SetupNotice";
import { Button } from "@/components/ui/button";
import { isDevLoginEnabled, isSupabaseConfigured } from "@/lib/env";
import { devLogin } from "../actions";
import { OtpForm } from "../OtpForm";

export const metadata: Metadata = { title: "Log in" };

// Seeded by `npm run seed`. Shown only when ENABLE_DEV_LOGIN=true in development.
const DEV_USERS = [
  { email: "parent@demo.offbook.test", label: "Demo parent" },
  { email: "admin@demo.offbook.test", label: "HQ admin" },
  { email: "content@demo.offbook.test", label: "HQ content editor" },
  { email: "ops@demo.offbook.test", label: "HQ ops" },
  { email: "teacher@demo.offbook.test", label: "HQ teacher" },
  { email: "reviewer@demo.offbook.test", label: "HQ reviewer" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Parents and Offbook staff log in here.</p>
      </div>
      {isSupabaseConfigured() ? <OtpForm mode="login" next={nextPath} /> : <SetupNotice />}
      <p className="text-sm text-muted">
        New to Offbook?{" "}
        <Link href="/signup" className="font-semibold text-accent underline underline-offset-4">
          Create a parent account
        </Link>
      </p>
      {isDevLoginEnabled() && isSupabaseConfigured() && (
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold text-muted">Development only</p>
          <div className="flex flex-col gap-2">
            {DEV_USERS.map((u) => (
              <form key={u.email} action={devLogin}>
                <input type="hidden" name="email" value={u.email} />
                <Button type="submit" variant="secondary" className="w-full">
                  Sign in as {u.label}
                </Button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
