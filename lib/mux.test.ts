import { createHmac, createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signPlaybackToken, verifyMuxSignature } from "./mux";

describe("verifyMuxSignature", () => {
  const secret = "whsec_test";
  const body = '{"type":"video.asset.ready"}';
  const now = 1_800_000_000;
  const sign = (t: number, b = body) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${b}`).digest("hex")}`;

  it("accepts a fresh, correct signature", () => {
    expect(verifyMuxSignature(body, sign(now), secret, now)).toBe(true);
  });

  it("rejects a tampered body, a wrong secret or an old timestamp", () => {
    expect(verifyMuxSignature('{"type":"x"}', sign(now), secret, now)).toBe(false);
    expect(verifyMuxSignature(body, sign(now), "other", now)).toBe(false);
    expect(verifyMuxSignature(body, sign(now - 600), secret, now)).toBe(false);
    expect(verifyMuxSignature(body, "garbage", secret, now)).toBe(false);
  });
});

describe("signPlaybackToken", () => {
  it("produces an RS256 JWT for the playback id that verifies with the public key", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pemB64 = Buffer.from(privateKey.export({ type: "pkcs1", format: "pem" })).toString("base64");
    const token = signPlaybackToken("PLAYBACK123", { keyId: "KEY1", privateKeyBase64: pemB64, ttlSec: 60 });
    const [h, p, s] = token.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toMatchObject({ alg: "RS256", kid: "KEY1" });
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    expect(payload).toMatchObject({ sub: "PLAYBACK123", aud: "v" });
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
  });
});
