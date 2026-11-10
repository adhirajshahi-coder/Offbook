import "server-only";

/**
 * Transactional email through Resend's REST API (PRD §5). Without a key,
 * emails are logged and skipped so local development never blocks on it.
 * Templates: lib/email-templates.ts.
 */

export type Email = { to: string; subject: string; html: string; text: string };

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
