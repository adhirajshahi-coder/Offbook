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
| D-034 | 2026-11-03 | Games and Challenges tabs show an honest "opening soon" page until Phase 4 | Keeps the PRD's tab layout without fake content |
| D-035 | 2026-11-03 | Known: local dev feels slow (200–500 ms per DB round trip from the build machine, ~7 trips per action). Production on Vercel Mumbai next to Supabase should be ~10× faster; revisit with a combined RPC if not | Measured during Phase 2 testing |
