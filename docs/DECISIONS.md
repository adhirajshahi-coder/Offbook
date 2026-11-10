# Decisions log

Ambiguities resolved during the build (PRD §0: pick the [ASSUMPTION] default, note it here, keep going). Newest last.

## Owner-approved (curriculum mapping, signed off 2026-11-02)

All ten owner decisions in `docs/curriculum/curriculum-mapping.md` were approved as proposed:

| # | Decision |
|---|---|
| O-1 | Nine zones (one per curriculum track) instead of five: Leaders' Peak, Cyber Cove, Code Canyon, Bot Bay, Puzzle Peaks, Founders' Forge, Discovery Delta, Voice Valley, Launchpad |
| O-2 | Keep school-subject courses and pitch them as "school plus real life" |
| O-3 | Bridge course (built from Level 1 lessons) first for students placed into Level 2 or 3 |
| O-4 | Level 1 order with Money Mint first |
| O-5 | Choice slots on the Level 2 and 3 paths |
| O-6 | Parent-controlled board-exam lighter mode in classes 10 and 12 |
| O-7 | Launch for classes 6–8 first; waitlist for 9–12 |
| O-8 | Solo capstone defaults; school-cohort variants for school-code students |
| O-9 | Electronics uses a browser simulator by default; hardware kit later as a paid add-on |
| O-10 | Generative AI and ML use a scripted sandbox until a lawyer clears specific tools |

## Build decisions

| # | Date | Decision | Why |
|---|---|---|---|
| D-001 | 2026-11-02 | Repo at `Documents/offbook`, branch per phase (`phase-0-foundation`, …) | Owner asked to plan then build; phases commit separately |
| D-002 | 2026-11-02 | Hosted Supabase project (Mumbai), migrations pushed with `npx supabase db push`; no local Supabase | Docker isn't installed on the build machine |
| D-003 | 2026-11-02 | Theme band is a generated column from `class_grade`; `content_level` is a separate field | Mapping §3: look comes from class, courses come from progress |
| D-004 | 2026-11-02 | `courses.level` (1–3) replaces the PRD's `courses.band` | Content level, not theme band, decides the path |
| D-005 | 2026-11-02 | PINs are bcrypt-hashed in Postgres (pgcrypto) in `student_pins`, a table with no RLS policies; only SECURITY DEFINER functions touch it. 5 wrong tries lock for 5 minutes | No client can ever read a hash; rate limiting lives next to the data |
| D-006 | 2026-11-02 | Child session = parent's Supabase session + an HMAC-signed, httpOnly cookie naming the profile, bound to the parent id, 12-hour expiry | PRD §7.1/§14: children have no auth account |
| D-007 | 2026-11-02 | Content below course level (missions, lessons, steps, questions) is staff-only in RLS; students will read it through unlock-checking RPCs (Phase 2) | Server-enforced unlocks (PRD §8); answers never reach the client |
| D-008 | 2026-11-02 | Parents can't update `xp`, `level`, `rank`, `content_level` or `parent_id` directly (trigger) | Progress changes only through RPCs |
| D-009 | 2026-11-02 | Email OTP sign-in (6-digit code or magic link) in Phase 0; phone OTP in Phase 1 once an SMS provider is chosen | Supabase phone auth needs an SMS provider account |
| D-010 | 2026-11-02 | Development-only "Sign in as demo user" buttons (`ENABLE_DEV_LOGIN=true`), using the service role to mint a magic link | PRD §17 seed-based demo mode for QA without email round trips |
| D-011 | 2026-11-02 | Next.js 16 `cacheComponents` turned off | Almost every route reads the session; Suspense-everywhere adds risk with no benefit yet |
| D-012 | 2026-11-02 | Phase 0 asks for parental consent (checkbox, version, timestamp, method → `consent_log`) when a child is added | DPDP: consent before processing a child's data; Phase 1 adds the full consent flow and withdrawal |
| D-013 | 2026-11-02 | Logo SVGs traced by hand from the owner's PNG; the PNG itself still needs saving to `public/brand/offbook-logo.png` | The PNG was shared in chat, not as a file |
| D-014 | 2026-11-02 | Launch-band accent is `#8A2EFF` instead of violet-600 on dark surfaces | White text on it is 5.4:1 (AA); keeps contrast on the night background |
| D-015 | 2026-11-02 | `proxy.ts` skips every `/_next/` path | Running the session refresh on the dev HMR socket caused an endless reload loop |
| D-016 | 2026-11-02 | `npm run db:push` connects with the DB password from `.env.local` (`scripts/db-push.mjs`) | `supabase link` needs a personal access token; the password is enough |
| D-017 | 2026-11-02 | Each phase merges into `main` and is pushed to github.com/adhirajshahi-coder/Offbook once verified end to end | Owner asked for pushes as the build proceeds |
| D-018 | 2026-11-02 | A school discount and a coupon don't stack: the family gets whichever saves more (`lib/pricing.ts`) | Simple to explain; can't produce surprise prices |
| D-019 | 2026-11-02 | Razorpay `checkout.js` loads only on the checkout page, only when the parent presses Pay | It's the payment processor, not a tracker; keeps /parent otherwise free of third-party scripts |
| D-020 | 2026-11-02 | Phone OTP still deferred | Needs an SMS provider and DLT template registration in India; email OTP covers sign-in until the owner picks one |
| D-021 | 2026-11-02 | "Cancel" means turning off renewal reminders; plans end on their own. Refunds are self-serve requests inside the window (default 7 days, `policies.refunds.meta.window_days`), handled by ops in HQ (Phase 3) | One-time annual payment, no mandate (PRD §19 #3, #9) |
| D-022 | 2026-11-02 | Invoice legal name and GSTIN come from `INVOICE_LEGAL_NAME` / `INVOICE_GSTIN`; GST 18% inclusive by default in `plans` | PRD §11 [VERIFY] with a CA before launch |
| D-023 | 2026-11-02 | Marketing forms write to `lead_submissions` (deduped per email per day, UTM kept) until the Phase 5 CRM imports them | Lead capture works from day one without building the CRM early |
| D-024 | 2026-11-02 | No product analytics and no cookie banner yet | No analytics tool is installed; add both together if one is (PRD §5) |
| D-025 | 2026-11-02 | Renewal opens 30 days before a year ends; a renewal starts when the current year ends, so no days are lost | Prevents accidental double payment |
| D-026 | 2026-11-03 | Unlocks and progress are enforced in trusted server code: the pure engine in `lib/gamification/unlocks.ts` decides, Play server actions write with the service role. RLS lets parents read their children's progress; nothing is client-writable | One tested implementation of the rules instead of duplicating them in SQL; direct API access is still blocked by RLS (PRD §8) |
| D-027 | 2026-11-03 | Boss challenges are auto-scored scenario rounds (pass at 75%) until the games ship in Phase 4; staff review applies to capstones. Make steps are kept as submissions for sampling in the Phase 4 review queue | Keeps missions completable without staff waits (PRD §8 "never block on staff latency") |
| D-028 | 2026-11-03 | A course completes when every published mission is done and the capstone is approved; mission quizzes stand in for the separate final mastery check | Avoids a second quiz layer before Phase 3 tooling exists |
| D-029 | 2026-11-03 | Mission quiz = 5 question groups from the mission's lessons, a fresh variant each try, no hints, 80% to pass. Daily warm-up uses due Retry Vault items and tops up from finished lessons when fewer than 3 are due | PRD §7.6, §8 |
| D-030 | 2026-11-03 | Rank thresholds by completed courses: Explorer 1, Builder 3, Maker 6, Pioneer 10, Founder 16, Legend 24 | Level 1 alone (13 courses) reaches Pioneer; Legend spans the whole journey |
| D-031 | 2026-11-03 | Skill mastery from correct answers: 2 familiar, 4 proficient, 6 mastered (lights the constellation) | Simple, explainable, tunable later |
| D-032 | 2026-11-03 | Lesson content is seeded from `supabase/seed-data/content/*.ts` and upserted on stable keys (`questions.seed_key`, order indexes), so re-seeding never wipes progress. HQ editing arrives in Phase 3 | Content stays data-driven in the DB |
| D-033 | 2026-11-03 | The "simulator" question type is deferred; sliders cover rupee maths for now | Ship the six core types first |
| D-034 | 2026-11-03 | Games and Challenges tabs showed an honest "opening soon" page until Phase 4 (superseded by D-046–D-048) | Keeps the PRD's tab layout without fake content |
| D-035 | 2026-11-03 | Known: local dev feels slow (200–500 ms per DB round trip from the build machine, ~7 trips per action). Production on Vercel Mumbai next to Supabase should be ~10× faster; revisit with a combined RPC if not | Measured during Phase 2 testing |
| D-036 | 2026-11-04 | HQ primitives are written in place in the shadcn/ui style (`components/hq/ui.tsx`, `forms.tsx`, `DataTable.tsx`) instead of running the shadcn CLI; TanStack Table v8, cmdk, dnd-kit as the PRD lists | Same look and behaviour with fewer generated files; v9 of TanStack Table has a different API |
| D-037 | 2026-11-04 | `logging.browserToTerminal: false` in `next.config.ts` | Next 16 writes forwarded browser logs to `.next/dev/logs`, which the dev watcher on this machine treated as a change: an endless reload loop (the real cause of the earlier loop; D-015 helped but wasn't enough) |
| D-038 | 2026-11-04 | Study cards are edited as title + text + illustration fields, not Tiptap rich text | Cards are 1–3 short sentences by design (PRD §9.2); rich text adds risk with no benefit. Revisit if long-form content arrives |
| D-039 | 2026-11-04 | HQ writes run as the signed-in staff member (RLS enforces the role); the service role is used only where no client policy exists (creating staff accounts, clearing a student's progress on reset), always after a role check and with an audit entry | PRD §12.10: enforce in RLS and server actions |
| D-040 | 2026-11-04 | Saving a published lesson runs the full publish checklist; removed question variants are archived, not deleted; removed steps delete their progress rows | Students never see a half-edited lesson; past answers stay intact |
| D-041 | 2026-11-04 | Course reset clears that course's progress rows (XP stays in the ledger); only "unlock" overrides stay in force in the unlock engine | A stored "reset" would otherwise hide all future progress on that course |
| D-042 | 2026-11-04 | Video uploads go browser → Mux (UpChunk, resumable); signed playback only (6 h staff preview, 3 h student tokens); "Check status" polls Mux when webhooks can't reach the server (local dev). Watch step needs 85% of unique seconds watched by default | PRD §10.2, §8 |
| D-043 | 2026-11-04 | Opening a student's record in HQ writes `child_record.view` to the audit log | PRD §12.10: audit data access to child records |
| D-044 | 2026-11-04 | Refund approval calls Razorpay's refund API when the payment came through Razorpay; otherwise it's approved for manual payment and then marked refunded. The plan ends when a refund is approved; the parent is emailed either way | PRD §11 |
| D-045 | 2026-11-04 | Challenge submissions are text plus an optional http(s) link; no photo or file uploads from children in this release | PRD §13: avoids storing images of children and their homes; reviewers see the link as untrusted |
| D-046 | 2026-11-04 | Games run in the browser from a server-issued seed; finishing sends only the player's inputs and the server replays them through the same pure engine. Game XP: 10 base + 20 for a win + up to 20 from score/level, max 50 a session and 150 per IST day from games | Scores can't be forged; PRD §7.8 caps. Configs are visible to the client (choice tags included), an accepted trade-off since scoring is server-side |
| D-047 | 2026-11-04 | Budget Bazaar dips into savings automatically when a week's cash runs short (−5 joy, −30 score per dip); broke only if savings can't cover it | Real budgeting has a buffer; early play-testing showed greedy savers going broke unfairly |
| D-048 | 2026-11-04 | A game or challenge opens once its course is reached (in progress, under review, preview or completed), not only when completed | "Each game unlocks when you reach its course" (PRD §7.7) |
| D-049 | 2026-11-04 | Review queue: capstones and challenges, 48 h target, alert at 36 h; ~1 in 8 Make steps sampled by id. Capstone approval completes the course (150 XP, rank, certificate, portfolio card, parent email); revision or rejection reopens the capstone. Decisions are written as the reviewer (RLS), effects with the service role | PRD §11.3, §7.9 |
| D-050 | 2026-11-04 | Portfolio is private by default. A public page needs a parent-set handle (which also sets `public_portfolio`) and per-item ticks; it shows first name, band and rank, and is noindex. Showcase needs parent consent and reviewer/ops approval (a DB trigger enforces it) | PRD §13 |
| D-051 | 2026-11-04 | Certificate codes are `OB-XXXX-XXXX` from an unambiguous alphabet; /certificates/[code] doubles as verification | Printable and checkable without an account |
| D-052 | 2026-11-04 | Leagues: opt-in per child (`league_opt_in`, off by default), cohorts of up to 30 by band and tier, top/bottom 5 move (gentler under 10 members), weekly XP read live from the ledger and frozen at rollover. Reactions are five preset stickers, once per sticker per person per week | PRD §7.8, §13 |
| D-053 | 2026-11-04 | Added a demo reviewer account (`reviewer@demo.offbook.test`) | Exercises the reviewer role end to end |
| D-054 | 2026-11-10 | The CRM is native tables (organizations, contacts, families, pipelines/stages, deals, activities, campaigns, referral_codes, custom_fields, saved_views). Sales and marketing write; ops and viewers read; ops may flag families and log family activities; pipelines and custom fields are admin-only | PRD §12.1, §12.10, enforced in RLS and server actions |
| D-055 | 2026-11-10 | A deal's status (open/won/lost), closed_at and stage_changed_at follow its stage via triggers; every stage change is written to deal_stage_history. Staff can't set them directly; trusted server code can (backfills) | One source of truth for win rate, cycle length and timelines |
| D-056 | 2026-11-10 | Default pipelines are created by the migration (Schools: New → … → Paid → Renewal, plus Lost; Families: Signed up → Trial/preview → Paid → Active (30 days) → Renewal due → Renewed / Lost), with editable probabilities and stale days (14 schools, 21 families) | PRD §12.2; Lost added so deals can close without being deleted |
| D-057 | 2026-11-10 | Lead capture: every form submission is still stored raw in lead_submissions, then becomes a contact deduped by email, then phone (Indian numbers compared on their last 10 digits). School leads also get an organization (matched by name) and a Schools deal, an owner by round robin over active sales staff (admins if none), and a "Call within 1 business day" task due 18:00 IST the next weekday. Existing contacts only have blanks filled | PRD §12.3, §12.8 |
| D-058 | 2026-11-10 | Family deals are synced from product data by the daily job (and a "Sync from product data" button): one deal per family that only moves forward automatically. Renewal deals open 30 days before a plan ends; reminder emails go at 14 and 7 days (each once, honouring the renewal_reminders switch, always linking the refund policy) | PRD §12.8; no pressure tactics (§12.9) |
| D-059 | 2026-11-10 | Inactive 7 days = an active-plan child with no XP events for 7 days (plans younger than a week excluded). The family is flagged at risk and gets one supportive email per inactive stretch (skipped if the parent turned off weekly summaries); the flag clears when they're back | PRD §12.8 "supportive, not a sales push" |
| D-060 | 2026-11-10 | Automations run from /api/cron/crm-daily with a Bearer CRON_SECRET (shared helper with league rollover). Idempotency: automation_key on deals/tasks, automation_log for emails | Safe to re-run any time |
| D-061 | 2026-11-10 | Attribution is first-touch and first-party: the proxy stores utm_* and ?ref= in an httpOnly ob_attr cookie for 30 days; at sign-up it's copied to parents.signup_utm and referral_code_id, and checkout carries the referral code onto the subscription. No analytics or ad trackers (D-024, PRD §13), so website visits aren't counted | PRD §12.5 |
| D-062 | 2026-11-10 | Referral payouts are tracked by hand: owed = revenue from referred paid plans × payout % − recorded payouts | PRD §12.5 "manual payout tracking in v1" |
| D-063 | 2026-11-10 | Reports are computed on the server from live tables per request (fine at current scale; move heavy ones to SQL views/materialized views later). All report roles (sales, marketing, ops, viewer, admin) see all five areas: they're aggregates with no child names. Sprint completion = missions completed ÷ missions started (a lesson started). NPS, support backlog and live-session attendance show "not collected yet" until those features exist. CSV exports are audited | PRD §12.7, §12.10 |
| D-064 | 2026-11-10 | Charts: single-series bars in violet-600 (validated against the HQ surface), thin bars with rounded ends, recessive grid, hover tooltip and a "Show as table" view on every chart; no dual axes | Data-viz guidance; accessibility |
| D-065 | 2026-11-10 | Custom fields store values in each record's custom jsonb, keyed by a slug of the label. Removing a field hides values without deleting them | PRD §12.1; reversible |
| D-066 | 2026-11-10 | Opening a family in the CRM writes child_record.view to the audit log (it shows children's usage) | PRD §12.10 |
| D-067 | 2026-11-10 | Demo CRM staff: sales@, sales2@, marketing@, viewer@demo.offbook.test; demo schools, contacts and deals use .demo.test addresses | Exercises roles end to end |
| D-068 | 2026-11-11 | Say It Better's 30-second speaking challenge records in the browser only (MediaRecorder); recordings are never uploaded, and the self-rubric adds score but never decides a win | PRD §7.7 "self-rubric (v1)"; no child audio stored (§13) |
| D-069 | 2026-11-11 | Bot Builder trains a tiny naive Bayes word classifier from the child's labels and tests it on unseen examples; prompts get scripted replies (no live AI in v1) | PRD §7.7; deterministic and explainable |
| D-070 | 2026-11-11 | Startup Sprint: product fit from interview question quality, demand from price vs the customer's ideal price, a 30% boost for the right channel, word of mouth, and seeded ±15% market luck. Goals set from simulations so careful play wins and half-hearted play mostly doesn't | PRD §7.7 "decisions change results" |
| D-071 | 2026-11-11 | Every game is registered in lib/games/registry.ts (config schema, input schema, replay, levels); actions, HQ editor/test play and seed use it. Game content tests guard against easy exploits (e.g. Say It Better's best answer can't be predicted by length) | One path for all five games |
| D-072 | 2026-11-11 | Coins = floor(total XP / 10) − coins spent (computed, not stored). Locker items are DB rows rendered by built-in Kube assets; some need a level. Purchases and outfits are written only by the server after checks; a DB guard stops parents setting equipped directly | PRD §7.8 "coins from XP, cosmetics only"; no real money |
| D-073 | 2026-11-11 | Calm motion (in-app reduce motion) and sound are per-device settings on Me; calm disables Kube bobbing, transitions and confetti. A gentle break note appears after 45 minutes in one sitting | PRD §4.7, §7.8 healthy-use guardrails |
| D-074 | 2026-11-11 | PWA: manifest starts at /play; the service worker caches only hashed static assets, icons and an offline page, never pages or API responses, so no child data sits in a device cache. Registered in production builds only | PRD §17; privacy |
| D-075 | 2026-11-11 | Error tracking is first-party (error_events via onRequestError and error boundaries → /api/errors), with query strings dropped and messages capped; HQ → Settings → System shows integrations, job heartbeats and recent errors. Swap for Sentry later in lib/monitoring.ts | PRD §17 observability without a third-party tracker |
| D-076 | 2026-11-11 | Weekly parent summary: in the Parent Zone and a Monday email via /api/cron/weekly-summary, skipped when nothing happened or the parent turned weekly updates off | PRD §7.11 |
| D-077 | 2026-11-11 | Public marketing pages read through a cookie-free Supabase client and are static, revalidated every 10 minutes (Showcase hourly plus on moderation). Variable fonts replace per-weight files; the home page's try-it challenge loads after first paint | Lighthouse: TTFB and main-thread work |
| D-078 | 2026-11-11 | Playwright critical path uses an admin-created account (email codes can't be automated) and a temporary 100% coupon (no Razorpay test keys yet), then the real UI for consent, checkout, Play, capstone, review and unlock; it cleans up after itself | PRD §16 Phase 6 done criterion, stated honestly |
| D-079 | 2026-11-11 | Locked cards no longer use opacity (it failed colour contrast); dashed borders and "Locked" labels carry the state | WCAG 2.1 AA |
