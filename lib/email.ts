import "server-only";

/**
 * Transactional email through Resend's REST API (PRD §5). Without a key,
 * emails are logged and skipped so local development never blocks on it.
 */

type Email = { to: string; subject: string; html: string; text: string };

export async function sendEmail(email: Email): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email skipped: no RESEND_API_KEY] to=${email.to} subject="${email.subject}"`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Offbook <onboarding@resend.dev>",
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!res.ok) {
    console.error(`[email failed] ${res.status} ${(await res.text()).slice(0, 200)}`);
    return { sent: false };
  }
  return { sent: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function receiptEmail(input: {
  parentName: string | null;
  childName: string;
  invoiceNumber: string;
  amount: string;
  tax: string;
  endsOn: string;
  invoiceUrl: string;
  refundDays: number;
}): Omit<Email, "to"> {
  const hi = input.parentName ? `Hi ${input.parentName.split(" ")[0]},` : "Hi,";
  const text = [
    hi,
    "",
    `Thanks! ${input.childName}'s Offbook year is active until ${input.endsOn}.`,
    "",
    `Invoice ${input.invoiceNumber}: ${input.amount} (includes GST of ${input.tax}).`,
    `View or print it: ${input.invoiceUrl}`,
    "",
    `Changed your mind? You can ask for a full refund within ${input.refundDays} days from the Billing page. No questions asked.`,
    "We won't charge you again automatically. We'll remind you before the year ends.",
    "",
    "The Offbook team",
  ].join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#121214;max-width:520px">
<p>${escapeHtml(hi)}</p>
<p>Thanks! <strong>${escapeHtml(input.childName)}</strong>'s Offbook year is active until <strong>${escapeHtml(input.endsOn)}</strong>.</p>
<p>Invoice ${escapeHtml(input.invoiceNumber)}: <strong>${escapeHtml(input.amount)}</strong> (includes GST of ${escapeHtml(input.tax)}).<br>
<a href="${escapeHtml(input.invoiceUrl)}" style="color:#7B14FF">View or print your invoice</a></p>
<p>Changed your mind? You can ask for a full refund within ${input.refundDays} days from the Billing page. No questions asked.<br>
We won't charge you again automatically. We'll remind you before the year ends.</p>
<p>The Offbook team</p></div>`;

  return { subject: `Receipt ${input.invoiceNumber}: ${input.childName}'s Offbook year`, html, text };
}
