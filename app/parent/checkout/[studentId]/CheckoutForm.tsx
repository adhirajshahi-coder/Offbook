"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { confirmPayment, previewQuote, startCheckout, type QuoteView } from "../actions";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error: { description: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutForm({
  studentId,
  childName,
  initial,
  paymentsReady,
  testMode,
}: {
  studentId: string;
  childName: string;
  initial: QuoteView;
  paymentsReady: boolean;
  testMode: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [applying, startApply] = useTransition();
  const [paying, setPaying] = useState(false);

  function apply() {
    setError(null);
    startApply(async () => setQ(await previewQuote(code)));
  }

  async function pay() {
    setError(null);
    setPaying(true);
    let opened = false;
    try {
      const res = await startCheckout(studentId, q.code);
      if (res.mode === "error") return setError(res.error);
      if (res.mode === "done") return router.push("/parent?paid=1");

      if (!(await loadRazorpay()) || !window.Razorpay) {
        return setError("The payment window didn't load. Check your connection and try again.");
      }
      const rzp = new window.Razorpay({
        key: res.keyId,
        order_id: res.orderId,
        amount: res.amountPaise,
        currency: "INR",
        name: "Offbook",
        description: `${childName}'s Offbook year`,
        prefill: res.email ? { email: res.email } : undefined,
        theme: { color: "#7B14FF" },
        handler: async (r: RazorpayResponse) => {
          setStatus("Confirming your payment…");
          const done = await confirmPayment({
            orderId: r.razorpay_order_id,
            paymentId: r.razorpay_payment_id,
            signature: r.razorpay_signature,
          });
          if (done.ok) router.push("/parent?paid=1");
          else {
            setStatus(null);
            setError(done.error ?? "Something went wrong.");
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on("payment.failed", (r) => setError(`Payment didn't go through: ${r.error.description}`));
      rzp.open();
      opened = true;
    } finally {
      // While the Razorpay window is open the button stays disabled; ondismiss re-enables it.
      if (!opened) setPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <dl className="space-y-2 rounded-[14px] bg-violet-50 p-4">
        <div className="flex justify-between">
          <dt>Offbook year for {childName}</dt>
          <dd>{q.list}</dd>
        </div>
        {q.discount && (
          <div className="flex justify-between text-[#0b7a57]">
            <dt>{q.label}</dt>
            <dd>−{q.discount}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
          <dt>Total</dt>
          <dd>{q.total}</dd>
        </div>
        <p className="text-sm text-muted">
          {q.taxNote} ({q.tax}). One payment for the year, no auto-renewal.
        </p>
      </dl>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-sm font-semibold">
          School code or coupon <span className="font-normal text-muted">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            className="min-h-11 flex-1 rounded-band border border-line bg-white px-3 text-base uppercase"
          />
          <Button type="button" variant="secondary" onClick={apply} disabled={applying || !code.trim()}>
            {applying ? "Checking…" : "Apply"}
          </Button>
        </div>
        {q.error && (
          <p role="alert" className="text-sm font-medium text-[#b4233f]">
            {q.error}
          </p>
        )}
        {!q.error && q.label && !q.discount && <p className="text-sm text-muted">{q.label}</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-[#f2c2cc] bg-[#fdf1f3] px-3 py-2 text-sm">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-sm font-medium">
          {status}
        </p>
      )}

      <Button type="button" onClick={pay} disabled={paying || (!paymentsReady && q.total !== "₹0")}>
        {paying ? "Opening payment…" : `Pay ${q.total}`}
      </Button>
      {!paymentsReady && <p className="text-sm text-muted">Payments aren&apos;t switched on yet.</p>}
      {paymentsReady && testMode && (
        <p className="text-sm text-muted">
          Test mode: no real money moves. Use Razorpay&apos;s test card or UPI ID <code>success@razorpay</code>.
        </p>
      )}
    </div>
  );
}
