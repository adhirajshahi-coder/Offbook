import "server-only";
import { createHmac, createSign, timingSafeEqual } from "node:crypto";

/**
 * Mux video (PRD §10.2): browser uploads go straight to Mux, a webhook
 * reports status, playback uses short-lived signed tokens. Test environment
 * until launch. Plain REST, no SDK.
 */

export function isMuxConfigured(): boolean {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export function isMuxSigningConfigured(): boolean {
  return Boolean(process.env.MUX_SIGNING_KEY_ID && process.env.MUX_SIGNING_KEY_PRIVATE);
}

async function mux<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString("base64");
  const res = await fetch(`https://api.mux.com${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mux ${path} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { data: T }).data;
}

/** A resumable direct upload URL. `passthrough` carries our video id back in webhooks. */
export async function createDirectUpload(input: { passthrough: string; corsOrigin: string }) {
  return mux<{ id: string; url: string }>("/video/v1/uploads", {
    method: "POST",
    body: JSON.stringify({
      cors_origin: input.corsOrigin,
      new_asset_settings: {
        playback_policy: ["signed"],
        passthrough: input.passthrough,
        video_quality: "basic",
      },
    }),
  });
}

export type MuxUpload = { id: string; status: string; asset_id?: string; error?: { message?: string } };
export type MuxAsset = { id: string; status: "preparing" | "ready" | "errored"; duration?: number; playback_ids?: { id: string; policy: string }[]; errors?: { messages?: string[] } };

export const getUpload = (id: string) => mux<MuxUpload>(`/video/v1/uploads/${id}`);
export const getAsset = (id: string) => mux<MuxAsset>(`/video/v1/assets/${id}`);

/**
 * Mux-Signature: "t=<unix>,v1=<hex>" where v1 = HMAC-SHA256(secret, `${t}.${body}`).
 * Rejects signatures older than 5 minutes.
 */
export function verifyMuxSignature(rawBody: string, header: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(t) || Math.abs(nowSec - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(parts.v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/**
 * Signed playback token (RS256 JWT) for a playback id. `aud` is "v" for
 * video and "t" for thumbnails. The private key env var holds the
 * base64-encoded PEM that Mux gives you.
 */
export function signPlaybackToken(
  playbackId: string,
  opts: { aud?: "v" | "t" | "s"; ttlSec?: number; keyId?: string; privateKeyBase64?: string } = {},
): string {
  const keyId = opts.keyId ?? process.env.MUX_SIGNING_KEY_ID!;
  const pem = Buffer.from(opts.privateKeyBase64 ?? process.env.MUX_SIGNING_KEY_PRIVATE!, "base64").toString("utf8");
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: keyId }));
  const payload = b64url(
    JSON.stringify({ sub: playbackId, aud: opts.aud ?? "v", exp: Math.floor(Date.now() / 1000) + (opts.ttlSec ?? 6 * 3600), kid: keyId }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(pem);
  return `${header}.${payload}.${b64url(signature)}`;
}
