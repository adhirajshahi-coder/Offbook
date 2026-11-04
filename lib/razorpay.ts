import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay Orders + Checkout (PRD §5: one-time annual payment, manual
 * renewal). Test-mode keys only until the owner switches to production.
 * Plain REST, no SDK: we only need orders, and signatures are HMACs.
 */

export function razorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID || null;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function isRazorpayTestMode(): boolean {
  return (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_");
}

function keySecret(): string {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set");
  return secret;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string };

export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${keySecret()}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/** Full or partial refund of a captured payment (PRD §11). */
export async function refundPayment(paymentId: string, amountPaise: number): Promise<{ id: string; status: string }> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${keySecret()}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, speed: "normal" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay refund failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { id: string; status: string };
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Checkout success handler signature: HMAC(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  return safeEqualHex(hmacHex(keySecret(), `${orderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqualHex(hmacHex(secret, rawBody), signature);
}
