import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { studentSessionSecret } from "@/lib/env";

/**
 * The child's "session" is the parent's Supabase session plus a signed
 * cookie naming the selected profile (PRD §7.1, §14 RLS principle). The
 * cookie is bound to the parent's user id so it cannot be reused by
 * another account on the same device.
 */

const COOKIE = "ob_student";
const MAX_AGE_SECONDS = 60 * 60 * 12; // re-enter the PIN at least twice a day

function sign(payload: string): string {
  return createHmac("sha256", studentSessionSecret()).update(payload).digest("base64url");
}

export function encodeStudentToken(parentId: string, studentId: string, issuedAt = Date.now()): string {
  const payload = `${parentId}.${studentId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeStudentToken(
  token: string,
  parentId: string,
  now = Date.now(),
): string | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [tokenParent, studentId, issuedAtRaw, signature] = parts;
  const expected = sign(`${tokenParent}.${studentId}.${issuedAtRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (tokenParent !== parentId) return null;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || now - issuedAt > MAX_AGE_SECONDS * 1000) return null;
  return studentId;
}

export async function setStudentSession(parentId: string, studentId: string) {
  const store = await cookies();
  store.set(COOKIE, encodeStudentToken(parentId, studentId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getStudentSessionId(parentId: string): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? decodeStudentToken(token, parentId) : null;
}

export async function clearStudentSession() {
  const store = await cookies();
  store.delete(COOKIE);
}
