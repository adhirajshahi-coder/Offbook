"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDevLoginEnabled, isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type OtpState = {
  step: "email" | "code";
  email?: string;
  error?: string;
  message?: string;
};

const emailSchema = z.email("Enter a valid email address");
const codeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the email");

/** Only allow same-site relative paths as post-login destinations. */
function safeNext(next: FormDataEntryValue | null): string | null {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

async function homeFor(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("id").eq("id", userId).maybeSingle();
  return data ? "/hq" : "/parent";
}

export async function requestCode(prev: OtpState, formData: FormData): Promise<OtpState> {
  if (!isSupabaseConfigured()) return { step: "email", error: "Sign-in isn't set up yet." };

  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { step: "email", error: parsed.error.issues[0].message };

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (mode === "signup" && !name) return { step: "email", error: "Tell us your name" };

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      shouldCreateUser: mode === "signup",
      emailRedirectTo: `${siteUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
      data: mode === "signup" ? { kind: "parent", name } : undefined,
    },
  });

  if (error) {
    // Don't reveal whether an account exists on login.
    if (mode === "login" && /signups not allowed|not found/i.test(error.message)) {
      return {
        step: "code",
        email: parsed.data,
        message: "If you have an account, we've emailed you a code.",
      };
    }
    return { step: "email", error: "We couldn't send the code. Try again in a minute." };
  }

  return { step: "code", email: parsed.data, message: "We've emailed you a 6-digit code." };
}

export async function verifyCode(prev: OtpState, formData: FormData): Promise<OtpState> {
  const email = String(formData.get("email") ?? "");
  const parsed = codeSchema.safeParse(String(formData.get("code") ?? "").trim());
  if (!parsed.success) return { step: "code", email, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });
  if (error || !data.user) {
    return { step: "code", email, error: "That code didn't work. Check it, or ask for a new one." };
  }

  redirect(safeNext(formData.get("next")) ?? (await homeFor(data.user.id)));
}

/** Development only: sign in as a seeded user without an email round trip. */
export async function devLogin(formData: FormData) {
  if (!isDevLoginEnabled()) throw new Error("Dev login is disabled");
  const email = String(formData.get("email") ?? "");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "No link");

  const supabase = await createClient();
  const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError || !session.user) throw new Error(verifyError?.message ?? "Sign-in failed");
  redirect(await homeFor(session.user.id));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
