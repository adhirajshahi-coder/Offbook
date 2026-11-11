# Offbook launch checklist

What must be true before real families pay. ✅ done and verified in this repo · ⬜ needs an owner action · ⚠️ needs a professional's sign-off.

## 1. Product works end to end
- ✅ Playwright critical path passes: sign-up → pay → learn → unlock → review (`npm run test:e2e` against a production build). Sign-up uses an admin-created account (email codes can't be read in automation) and pay uses a 100% coupon (Razorpay test keys missing).
- ✅ Unit tests (`npm test`), RLS tests against the live database (`npm run test:db`), typecheck and lint pass.
- ✅ All five games playable; server replays every run; XP capped at 50 a session and 150 a day.
- ⬜ One full manual run on a real mid-range Android phone over mobile data: sign-up with a real email code, a Razorpay test payment, a lesson with video.

## 2. Integrations (keys go in the host's environment, never in code)
- ⬜ **Razorpay**: test keys first (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`), one test payment and refund, then live keys. Webhook URL: `/api/razorpay/webhook`.
- ⬜ **Mux**: `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE`, `MUX_WEBHOOK_SECRET`. Webhook URL: `/api/mux/webhook`. Upload one video, attach it, preview it as a student.
- ⬜ **Resend**: `RESEND_API_KEY`, `EMAIL_FROM` on a verified domain (SPF/DKIM). Check every template at HQ → Settings → Email templates, then send one of each to yourself.
- ⬜ **Supabase Auth email**: custom SMTP (Resend) so login codes aren't rate-limited by the default sender; set the site URL and redirect URLs to the production domain.
- ⬜ **Scheduled jobs**: set `CRON_SECRET`, then schedule (e.g. Vercel Cron) with `Authorization: Bearer $CRON_SECRET`:
  - `/api/cron/crm-daily`: daily ~09:00 IST
  - `/api/cron/league-rollover`: Mondays just after 00:00 IST
  - `/api/cron/weekly-summary`: Mondays ~08:00 IST
  HQ → Settings → System shows each job's last run.
- ⬜ **Uptime monitor** on `/api/health` (returns 503 if the database is unreachable).

## 3. Hosting
- ⬜ Deploy to a region next to the database (Supabase is in Mumbai; use Vercel `bom1`), set `NEXT_PUBLIC_SITE_URL` to the real domain.
- ⬜ Set every variable in `.env.example`; `ENABLE_DEV_LOGIN` must be unset in production (dev login only ever works in development builds anyway).
- ⬜ Generate a fresh 32+ character `STUDENT_SESSION_SECRET` for production.
- ⬜ Point the domain, force HTTPS. Security headers are already sent (nosniff, referrer policy, frame options, permissions policy).
- ⬜ Turn on Supabase point-in-time recovery / daily backups; test a restore once.
- ⬜ Run `npm run seed` only against a non-production project. Production gets the migrations plus real content made in HQ (or a one-off content import), never demo accounts.

## 4. Performance and accessibility (measured on a local production build)
- ✅ Lighthouse mobile, public pages (`npm run lighthouse`): performance 85–96 (home varies 85–93 run to run), accessibility 100, best practices 100, SEO 100.
- ✅ Signed-in pages (`/play`, `/play/journey`, `/play/me`, `/play/games`, `/parent`): accessibility 100 after fixes, best practices 100, performance 85–95. The low end comes from 1–3 s server responses on this machine's long round trip to the database; re-measure once deployed next to it. Private pages are intentionally not indexable.
- ⚠️ LCP is 2.7–3.4 s under Lighthouse's simulated slow 4G, above the PRD's 2.5 s target. The heading paint is held by fonts and JS on a throttled CPU; re-measure on the deployed site (closer database, CDN) and on a real phone before deciding on further work (e.g. a system font for headings).
- ✅ Load test (`node scripts/load-test.mjs`): 25 concurrent users, 151 req/s, 0 errors, static pages p95 ≈ 40 ms. Re-run against the deployed site.
- ✅ Reduced motion respected (OS setting and in-app Calm motion); sound toggle; never colour alone for right/wrong; keyboard support in HQ (command palette, kanban keyboard sensor).
- ⬜ A screen-reader pass (TalkBack on Android, NVDA on Windows) through Play's lesson player and the Parent Zone.

## 5. Safety, privacy and legal ⚠️
- ⚠️ Privacy policy, terms, refund policy and safety pages are drafts marked [LEGAL REVIEW REQUIRED]: have a lawyer review against the DPDP Act and Rules (children under 18, verifiable parental consent).
- ⚠️ GST treatment and invoice details (`INVOICE_LEGAL_NAME`, `INVOICE_GSTIN`, tax-inclusive flag) confirmed by a CA.
- ✅ No child email, surname, photo or location collected; no free text visible to other children; leagues show first names and preset stickers only; voice recordings never leave the device.
- ✅ Nothing public without parent consent and staff approval (portfolio, Showcase); public pages are noindex.
- ✅ No third-party trackers on /play or /parent; first-party error logging stores no query strings or personal data.
- ✅ Audit log covers overrides, refunds, exports, role changes and child-record access.
- ⬜ Decide the data-retention period for deleted accounts and error logs, and add a scheduled clean-up.

## 6. Content
- ✅ Coding workspaces (Blocks, Python, Web, SQL) work in the lesson player and HQ preview; starter lessons are tested for solvability (`lib/workspaces/starters.test.ts` runs real Python and SQL).
- ⬜ Write Level 2/3 lessons into the draft missions (87 missions) and finish Cyber Safety and Learning How to Learn so the Bridge's last two missions fill in (`npm run seed` copies them once they're published).
- ⬜ Hosting must run `npm install` (or copy `public/runtimes`) so Pyodide and sql.js are served from your domain.
- ⬜ Content team reviews Money Mint and Critical Thinking lessons, question variants and the five games' text in HQ (game test play records nothing).
- ⬜ Replace the placeholder logo SVG with the real logo file (`public/brand/`), then regenerate icons: `node scripts/make-icons.mjs`.
- ⬜ Add a real cookie-free analytics decision if marketing needs visit counts (D-024); the funnel currently starts at sign-up.

## 7. Operations
- ⬜ Create real staff accounts in HQ → Settings → Team with the least role each person needs; remove demo staff from production.
- ⬜ Reviewers know the 48-hour SLA and canned feedback; ops know refunds and overrides.
- ⬜ Support inbox and live sessions are not built yet (later phase): publish a support email address on the site meanwhile.
