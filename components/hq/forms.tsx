"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { hqButton, hqInput, hqLabel, hqTextarea } from "./ui";

export function Field({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className={hqLabel}>{label}</span>
      {children}
      {hint && <span className="text-xs text-[#6b6778]">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(hqInput, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(hqTextarea, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(hqInput, props.className)} />;
}

/** Runs a server action, shows "Saved" / the error inline. */
export function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setMsg(null);
    start(async () => {
      try {
        const r = await fn();
        setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved.") : (r.error ?? "That didn't work.") });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "That didn't work." });
      }
    });
  }
  return { pending, msg, run };
}

export function ActionMessage({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <span role={msg.ok ? "status" : "alert"} className={cn("text-sm font-medium", msg.ok ? "text-[#1f6b2a]" : "text-[#b4233f]")}>
      {msg.text}
    </span>
  );
}

export function ActionButton({
  onClick,
  children,
  variant = "secondary",
  confirm,
  className,
}: {
  onClick: () => Promise<{ ok: boolean; error?: string; message?: string }>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  confirm?: string;
  className?: string;
}) {
  const { pending, msg, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={hqButton(variant, className)}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          run(onClick);
        }}
      >
        {children}
      </button>
      {msg && !msg.ok && <ActionMessage msg={msg} />}
    </span>
  );
}
