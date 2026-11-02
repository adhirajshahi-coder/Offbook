import type { Metadata } from "next";
import Link from "next/link";
import { SetupNotice } from "@/components/SetupNotice";
import { isSupabaseConfigured } from "@/lib/env";
import { OtpForm } from "../OtpForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black">Create a parent account</h1>
        <p className="mt-1 text-sm text-muted">
          You&apos;ll add your child&apos;s profile next. No passwords: we email you a code.
        </p>
      </div>
      {isSupabaseConfigured() ? <OtpForm mode="signup" /> : <SetupNotice />}
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
