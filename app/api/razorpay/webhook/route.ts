import { NextResponse, type NextRequest } from "next/server";
import { finalizePaidOrder } from "@/lib/billing";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Razorpay webhook (PRD §17: idempotent). Backs up the checkout handler in
 * case the browser closes before confirmation. Configure in the Razorpay
 * dashboard for `payment.captured` and `order.paid`, pointing at
 * https://<domain>/api/razorpay/webhook with RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: {
      payment?: { entity?: { id: string; order_id: string; status: string } };
      order?: { entity?: { id: string } };
    };
  };
  const eventId = request.headers.get("x-razorpay-event-id") ?? `${event.event}:${event.payload?.payment?.entity?.id}`;

  const db = createAdminClient();
  const { error: dupError } = await db
    .from("payment_events")
    .insert({ id: eventId, type: event.event, payload: event });
  if (dupError) {
    // 23505 = already processed this event.
    if (dupError.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id ?? event.payload?.order?.entity?.id;
    if (orderId && payment?.id) await finalizePaidOrder(orderId, payment.id);
  }

  return NextResponse.json({ ok: true });
}
