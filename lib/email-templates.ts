/**
 * Every Offbook email goes through one layout (PRD §16 Phase 6: email
 * templates): brand header, short body, one clear button, and a footer that
 * says why you got it and links to settings, refunds and privacy. Plain-text
 * versions are generated alongside. Pure, so HQ can preview them.
 */

export type Rendered = { subject: string; html: string; text: string };

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Block = { p: string } | { list: string[] } | { note: string };

type LayoutInput = {
  subject: string;
  preheader: string;
  greeting?: string;
  blocks: Block[];
  cta?: { label: string; href: string };
  /** Who this is for, shown in the footer. */
  audience: "parent" | "staff";
  why: string;
};

export function layout(input: LayoutInput): Rendered {
  const site = SITE();
  const body = input.blocks
    .map((b) =>
      "p" in b
        ? `<p style="margin:0 0 14px">${b.p}</p>`
        : "list" in b
          ? `<ul style="margin:0 0 14px;padding-left:20px">${b.list.map((li) => `<li style="margin:0 0 6px">${li}</li>`).join("")}</ul>`
          : `<p style="margin:0 0 14px;padding:10px 12px;background:#F5F0FF;border-radius:10px;font-size:14px">${b.note}</p>`,
    )
    .join("");
  const button = input.cta
    ? `<p style="margin:20px 0"><a href="${esc(input.cta.href)}" style="display:inline-block;background:#7B14FF;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px">${esc(input.cta.label)}</a></p>`
    : "";
  const footerLinks =
    input.audience === "parent"
      ? `<a href="${site}/parent" style="color:#6b6778">Parent Zone</a> · <a href="${site}/refunds" style="color:#6b6778">Refund policy</a> · <a href="${site}/privacy" style="color:#6b6778">Privacy</a>`
      : `<a href="${site}/hq" style="color:#6b6778">Offbook HQ</a>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(input.subject)}</title></head>
<body style="margin:0;background:#F5F0FF;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#121214">
<span style="display:none;max-height:0;overflow:hidden">${esc(input.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px">
<tr><td style="padding:22px 24px 0;font-size:22px;font-weight:900;letter-spacing:-0.5px"><span style="color:#121214">OFF</span><span style="color:#7B14FF">BOOK</span></td></tr>
<tr><td style="padding:16px 24px 8px;font-size:16px;line-height:1.55">
${input.greeting ? `<p style="margin:0 0 14px">${esc(input.greeting)}</p>` : ""}${body}${button}
<p style="margin:0">The Offbook team</p>
</td></tr>
<tr><td style="padding:16px 24px 22px;font-size:12px;line-height:1.5;color:#6b6778;border-top:1px solid #eeecf2">${esc(input.why)}<br>${footerLinks}</td></tr>
</table></td></tr></table></body></html>`;

  const textBlocks = input.blocks.map((b) => ("p" in b ? strip(b.p) : "list" in b ? b.list.map((li) => `• ${strip(li)}`).join("\n") : strip(b.note)));
  const text = [
    input.greeting,
    ...textBlocks,
    input.cta ? `${input.cta.label}: ${input.cta.href}` : null,
    "The Offbook team",
    "",
    "—",
    input.why,
    input.audience === "parent" ? `Parent Zone: ${site}/parent · Refunds: ${site}/refunds · Privacy: ${site}/privacy` : `${site}/hq`,
  ]
    .filter((x) => x !== null && x !== undefined)
    .join("\n\n");
  return { subject: input.subject, html, text };
}

function strip(html: string): string {
  return html.replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2 ($1)").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const hi = (name: string | null | undefined) => (name ? `Hi ${name.split(" ")[0]},` : "Hi,");
const PARENT_WHY = "You're getting this because you have an Offbook parent account.";

// ---------------------------------------------------------------------------

export function receiptEmail(i: { parentName: string | null; childName: string; invoiceNumber: string; amount: string; tax: string; endsOn: string; invoiceUrl: string; refundDays: number }): Rendered {
  return layout({
    subject: `Receipt ${i.invoiceNumber}: ${i.childName}'s Offbook year`,
    preheader: `${i.childName}'s year is active until ${i.endsOn}.`,
    greeting: hi(i.parentName),
    blocks: [
      { p: `Thanks! <strong>${esc(i.childName)}</strong>'s Offbook year is active until <strong>${esc(i.endsOn)}</strong>.` },
      { p: `Invoice ${esc(i.invoiceNumber)}: <strong>${esc(i.amount)}</strong> (includes GST of ${esc(i.tax)}).` },
      { note: `Changed your mind? Ask for a full refund within ${i.refundDays} days from the Billing page. We won't charge you again automatically; we'll remind you before the year ends.` },
    ],
    cta: { label: "View your invoice", href: i.invoiceUrl },
    audience: "parent",
    why: "You're getting this because you paid for an Offbook plan.",
  });
}

export function refundDecisionEmail(i: { parentName: string | null; childName: string; approved: boolean; amount: string; note?: string | null }): Rendered {
  return layout({
    subject: i.approved ? "Your Offbook refund" : "About your Offbook refund request",
    preheader: i.approved ? `Your refund of ${i.amount} is on its way.` : "An update on your refund request.",
    greeting: hi(i.parentName),
    blocks: i.approved
      ? [{ p: `We've approved your refund of <strong>${esc(i.amount)}</strong> for ${esc(i.childName)}'s plan. It usually reaches your account in 5–7 working days.` }, { p: "We're sorry Offbook wasn't the right fit. You're welcome back any time." }]
      : [{ p: `We couldn't approve the refund for ${esc(i.childName)}'s plan this time.` }, ...(i.note ? [{ note: esc(i.note) }] : []), { p: "If you think we got it wrong, just reply to this email." }],
    cta: { label: "Open Billing", href: `${SITE()}/parent/billing` },
    audience: "parent",
    why: "You're getting this because you asked for a refund.",
  });
}

export function renewalReminderEmail(i: { parentName: string | null; childName: string; daysLeft: number; endsOn: string }): Rendered {
  return layout({
    subject: `${i.childName}'s Offbook year ends in ${i.daysLeft} days`,
    preheader: `The plan ends on ${i.endsOn}. Nothing happens unless you choose to renew.`,
    greeting: hi(i.parentName),
    blocks: [
      { p: `${esc(i.childName)}'s Offbook plan ends on <strong>${esc(i.endsOn)}</strong>. If you'd like another year, you can renew from the Parent Zone.` },
      { p: "If not, there's nothing to do: the plan simply ends, and you won't be charged." },
      { note: "To stop these reminders, turn them off under Billing." },
    ],
    cta: { label: "See renewal options", href: `${SITE()}/parent/billing` },
    audience: "parent",
    why: PARENT_WHY,
  });
}

export function inactiveNudgeEmail(i: { parentName: string | null; childNames: string }): Rendered {
  return layout({
    subject: `A small idea for ${i.childNames} this week`,
    preheader: "A lesson takes about 10 minutes. No pressure at all.",
    greeting: hi(i.parentName),
    blocks: [
      { p: `${esc(i.childNames)} hasn't opened Offbook for about a week. That's completely normal: school gets busy.` },
      { p: "If it helps, a lesson takes about 10 minutes, and the Daily Warm-up is just 3 questions. Today could be a nice day to pick it back up together." },
      { p: "No pressure at all." },
    ],
    cta: { label: "Open Offbook", href: `${SITE()}/play` },
    audience: "parent",
    why: "You're getting this because weekly updates are on in your Parent Zone. You can turn them off there.",
  });
}

export function courseCompleteEmail(i: { parentName: string | null; childName: string; courseTitle: string; certificateUrl: string; rank: string; xp: number }): Rendered {
  return layout({
    subject: `${i.childName} finished ${i.courseTitle}!`,
    preheader: "Capstone approved and certificate issued.",
    greeting: hi(i.parentName),
    blocks: [
      { p: `${esc(i.childName)}'s capstone for <strong>${esc(i.courseTitle)}</strong> was approved by an Offbook reviewer.` },
      { p: `They're now ${esc(i.rank)} with ${i.xp} XP, and the next course on their Journey is open.` },
      { note: `Ask ${esc(i.childName)}: "What did you make for your capstone, and what would you change next time?"` },
    ],
    cta: { label: "See the certificate", href: i.certificateUrl },
    audience: "parent",
    why: PARENT_WHY,
  });
}

export type WeeklyChild = { name: string; lessons: number; activeDays: number; goal: number; mastered: string[]; askAbout: string | null };

export function weeklySummaryEmail(i: { parentName: string | null; weekOf: string; children: WeeklyChild[] }): Rendered {
  const lines = i.children.map((c) => {
    const parts = [`<strong>${esc(c.name)}</strong>: ${c.lessons} ${c.lessons === 1 ? "lesson" : "lessons"}, learned on ${c.activeDays} of ${c.goal} goal days`];
    if (c.mastered.length) parts.push(`mastered ${esc(c.mastered.join(", "))}`);
    return parts.join(" · ");
  });
  const prompts = i.children.filter((c) => c.askAbout).map((c) => `Ask ${esc(c.name)} about "${esc(c.askAbout!)}". What surprised them?`);
  return layout({
    subject: `Your Offbook week: ${i.children.map((c) => c.name).join(" & ")}`,
    preheader: `Lessons, skills and a conversation starter for the week of ${i.weekOf}.`,
    greeting: hi(i.parentName),
    blocks: [{ p: `Here's the week of ${esc(i.weekOf)}.` }, { list: lines }, ...(prompts.length ? [{ note: prompts.join("<br>") }] : [])],
    cta: { label: "Open the Parent Zone", href: `${SITE()}/parent` },
    audience: "parent",
    why: "You're getting this weekly summary because it's on in your Parent Zone. You can turn it off there.",
  });
}

export function reviewAlertEmail(i: { count: number; hours: number }): Rendered {
  return layout({
    subject: `${i.count} ${i.count === 1 ? "submission has" : "submissions have"} waited over ${i.hours} hours`,
    preheader: "Students are waiting on feedback.",
    blocks: [{ p: "Students are waiting on feedback. The oldest are at the top of the queue." }],
    cta: { label: "Open the review queue", href: `${SITE()}/hq/review` },
    audience: "staff",
    why: "You're getting this because you review student work at Offbook.",
  });
}
