"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { requestCode, verifyCode, type OtpState } from "./actions";

export function OtpForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [sendState, send, sending] = useActionState<OtpState, FormData>(requestCode, {
    step: "email",
  });
  const [verifyState, verify, verifying] = useActionState<OtpState, FormData>(verifyCode, {
    step: "code",
  });

  if (sendState.step === "code") {
    return (
      <form action={verify} className="flex flex-col gap-4">
        <p className="text-sm text-muted" role="status">
          {sendState.message} Sent to <strong className="text-text">{sendState.email}</strong>.
        </p>
        <input type="hidden" name="email" value={sendState.email} />
        {next && <input type="hidden" name="next" value={next} />}
        <Field
          label="6-digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          error={verifyState.error}
        />
        <Button type="submit" disabled={verifying}>
          {verifying ? "Checking…" : mode === "signup" ? "Create account" : "Log in"}
        </Button>
        <p className="text-sm text-muted">
          You can also tap the link in the email instead.
        </p>
      </form>
    );
  }

  return (
    <form action={send} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "signup" && (
        <Field label="Your name" name="name" autoComplete="name" required maxLength={60} />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        hint={mode === "signup" ? "Parents sign up. Your child never needs an email." : undefined}
        error={sendState.error}
      />
      <Button type="submit" disabled={sending}>
        {sending ? "Sending…" : "Email me a code"}
      </Button>
    </form>
  );
}
