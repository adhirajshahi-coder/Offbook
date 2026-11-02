/**
 * Draft policy pages (PRD §13). Every one is marked for legal review before
 * launch. After seeding, HQ (ops/admin) edits them; the seed only inserts
 * pages that don't exist yet, so edits are never overwritten.
 */

const REVIEW = "> **Draft: legal review required before launch.** This text is a plain-language starting point, not legal advice.";

export const POLICIES = [
  {
    slug: "privacy",
    title: "Privacy notice",
    version: "2026-11-draft-1",
    meta: {},
    body: `${REVIEW}

## The short version

- A **parent or guardian** holds every Offbook account and gives consent for their child.
- We collect only what learning needs: your child's **first name or nickname, class, avatar and progress**.
- We **never** ask a child for an email, surname, photo or location.
- **No ads, no third-party trackers** in the student app or the Parent Zone.
- You can **download** your family's data or **delete** a child's profile at any time from the Parent Zone.

## What we collect

**About you (the parent):** name, email or phone number, payment records (handled by Razorpay; we never see card details), and the consent you give.

**About your child:** first name or nickname, class, avatar choices, lessons and quizzes completed, XP, badges, projects they choose to submit, and a 4-digit PIN stored only in scrambled (hashed) form.

## How we use it

To run your child's learning, show you their progress, send receipts and reminders, and keep the service safe. Learning analytics are first-party only: they stay with Offbook.

## Children's data and consent

India's Digital Personal Data Protection rules treat everyone under 18 as a child. We ask for verifiable parental consent before creating a child's profile, record when and how it was given, and let you withdraw it at any time. Withdrawing consent pauses the profile straight away.

## Sharing

We use a small number of service providers to run Offbook (hosting, database, payments, email, video). They process data only on our instructions. We never sell data and never use it for advertising.

## Public work

Nothing your child makes appears publicly unless **you** switch it on and **our team** approves it.

## Your choices

- See and change your details in the Parent Zone.
- Download everything we hold: Parent Zone → Privacy and consent → Download our data.
- Delete a child's profile: Parent Zone → Children.
- Questions: email us and a person will reply.
`,
  },
  {
    slug: "terms",
    title: "Terms of use",
    version: "2026-11-draft-1",
    meta: {},
    body: `${REVIEW}

## Who can use Offbook

Accounts are held by parents or guardians aged 18 or over. Students in classes 6 to 12 use Offbook through a profile their parent creates.

## Your plan

Each child's plan is a single payment for 12 months of access. It does **not** renew automatically. Prices are shown in rupees and include GST unless stated.

## Using Offbook well

Students should be kind, honest and safe. Real-world challenges always come with a safety note and need a parent's okay. We never ask a child to contact or meet strangers.

## What you can expect from us

We work hard to keep Offbook available and safe, and we tell you about important changes. We don't promise particular marks, ranks or results.

## Content

Lessons, videos and games belong to Offbook. Work your child creates belongs to your family; by submitting it you let us store it and, only if you agree, show it on the Showcase.

## Ending your account

You can delete a child's profile at any time. Refunds follow our Refund and cancellation policy.
`,
  },
  {
    slug: "refunds",
    title: "Refund and cancellation policy",
    version: "2026-11-draft-1",
    meta: { window_days: 7 },
    body: `${REVIEW}

## Full refund within 7 days

If Offbook isn't right for your child, ask for a **full refund within 7 days** of paying. No questions asked. Go to Parent Zone → Billing → Ask for a refund.

We process refunds within **5 working days** to the original payment method. Your bank may take a few more days to show it.

## No automatic renewal

You pay once for a year. We **never** charge you again automatically. We remind you 14 and 7 days before the year ends, and you decide whether to renew. You can switch reminders off in Billing.

## Cancelling

There is nothing to cancel: plans simply end after 12 months. If you want to stop early after the refund window, contact us and we'll look at it fairly.

## Something went wrong?

If you were charged twice or a payment failed but money left your account, email us with the date and amount. We'll sort it quickly.
`,
  },
  {
    slug: "safety",
    title: "Safety",
    version: "2026-11-draft-1",
    meta: {},
    body: `${REVIEW}

## Built for children from day one

- **No chat, no DMs, no free-text posts** between students. Ever.
- **First names only.** Leagues show a first name and an avatar, nothing else.
- **Parent-held accounts.** Children never sign up themselves or give an email.
- **No ads and no third-party trackers** in the student app or Parent Zone.
- **Nothing goes public** without a parent's consent and our team's approval.

## Real-world challenges

Offline tasks (like selling something small to family or interviewing a neighbour) always include a **safety note** and need a **parent's acknowledgement** before they start. We never ask a child to contact strangers online or meet strangers.

## Healthy use

Sessions are short. After about 45 minutes, Kube suggests a break. There are no streak guilt-trips, no fake urgency, and at most one reminder a day, which parents control.

## Reporting a concern

If something worries you, email us. A person reads every message and replies quickly.
`,
  },
];
