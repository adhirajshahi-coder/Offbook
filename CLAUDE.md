# Offbook

Real-world skills for classes 6–12: a game-like student app (Play), a Parent Zone, and Offbook HQ (admin, CRM, content). Spec: `docs/prd-v1.0.docx`. The curriculum map approved by the owner, which overrides the PRD where they differ: `docs/curriculum/curriculum-mapping.md`. Decisions so far: `docs/DECISIONS.md`.

@AGENTS.md

## Rules (PRD §0)
- Build phases in order (below). Finish and verify one before starting the next. Commit at the end of each phase, on its own branch.
- After every phase: `npm run typecheck`, `npm run lint`, `npm test`; run the app; click through the new flows; fix what breaks. A phase isn't done until it works end to end.
- No lorem ipsum anywhere users see. Copy is plain, warm and short: a smart older friend, never baby talk. Mistakes are "Oops, good try", never "wrong". School plus real life, never anti-school. Buttons say exactly what happens.
- Never hardcode secrets: use `.env.local`, and keep `.env.example` current. Razorpay and Mux stay in test mode.
- When something is ambiguous, pick the [ASSUMPTION] default, log it in `docs/DECISIONS.md` and keep going. Only stop for irreversible decisions.
- Content is data-driven: courses, lessons, quizzes, videos and challenges live in the DB and are editable in HQ. Never hardcode them in components.
- Child safety: no child email, surname, photo, location or free text that others can see. No third-party trackers on /play or /parent. Nothing goes public without parent consent and staff approval.

## Stack
Next.js 16 (App Router, TypeScript; middleware is `proxy.ts`; `params`, `searchParams` and `cookies()` are async; read `node_modules/next/dist/docs/` before using unfamiliar APIs) · Tailwind v4 (tokens in `app/globals.css`) · motion · Supabase (Postgres, Auth, RLS, Storage) via `@supabase/ssr` · Zod · React Hook Form · Vitest. Later phases: shadcn/ui (HQ), @xyflow/react, TanStack Table/Query, dnd-kit, Recharts, Tiptap, Mux, Razorpay, Resend, Playwright.

## Layout
```
app/(marketing)    public site (+ /styleguide)
app/(auth)         login, signup, OTP actions
app/auth/callback  magic-link landing
app/parent         Parent Zone (requireParent)
app/play           student app; data-band theme wraps it (requireParent + profile PIN)
app/hq             Offbook HQ (requireStaff(roles))
app/api            health, webhooks, cron
components/brand   Logo (Wordmark, CubeMark, LevelUpArrow)
components/kid     Kube and kid-UI components
components/ui      shared primitives
lib/               auth.ts, bands.ts, env.ts, student-session.ts, supabase/{server,client}.ts
                   pricing.ts (pure, tested), billing.ts, razorpay.ts, email.ts, public-data.ts, parent-data.ts
components/marketing  page blocks, TryItChallenge, PilotForm
lib/play/          session (requireStudent), state (world, course, unlock), progress (XP, vault, mastery, badges), skills, stats
app/play/learn/actions.ts  every Play write: verify child session → re-check unlocks → write with service role
supabase/seed-data/content  written lessons (lesson-types.ts format), validated by content.test.ts
app/hq/content     Content Studio: courses, missions, lesson editor (+ preview), question builder, skills, videos (Mux)
app/hq/ops         students (overrides, PIN, placement), subscriptions and refunds
app/hq/settings    team roles, audit log
components/hq      HQ primitives: ui.tsx, forms.tsx, DataTable.tsx, CommandPalette.tsx
lib/mux.ts         direct uploads, webhook signature, signed playback tokens
lib/gamification/  xp, levels, unlocks, leitner, leagues: pure and unit-tested
lib/games/         seeded game engines (rng, budget-bazaar, decision-dojo, xp caps): pure; the server replays inputs to score
app/play/games     GameShell + game screens; actions start a seeded session and replay the run (50 XP/session, 150/day)
app/play/challenges  ask a parent -> parent grants in /parent/activity -> submit text or link -> review queue
app/hq/review      review queue (SLA, assign, rubric, canned feedback) + Showcase moderation; effects in lib/hq/review.ts
lib/portfolio.ts   portfolio, certificates (/certificates/[code]), public /p/[handle], /showcase: service role, filtered
lib/play/league.ts weekly leagues: lazy join, live standings, rollover (/api/cron/league-rollover, Bearer CRON_SECRET)
app/api/cron       league-rollover (Mondays) and crm-daily (daily); both need Authorization: Bearer $CRON_SECRET (lib/cron.ts)
app/hq/crm         CRM: My day, pipelines (kanban + table + forecast), deals, contacts, organizations, families, campaigns/referrals, CSV import
lib/crm/           rules.ts (stale, forecast, dedupe, round robin: pure, tested), leads.ts (captureLead), automations.ts (daily, idempotent), data.ts (timeline)
app/hq/reports     Executive / Sales / Marketing / Operations / Learning dashboards (lib/reports.ts), CSV export (audited)
lib/attribution.ts first-touch utm/ref cookie (proxy) → parents.signup_utm / referral_code_id at sign-up
supabase/migrations  SQL; RLS on every table
supabase/seed-data   the curriculum map as data (42 courses, 9 tracks, 6 slots, 5 games)
scripts/seed.ts    npm run seed / seed:reset
tests/             rls.test.ts (live DB, `npm run test:db`), stubs
docs/              PRD, curriculum, mapping, DECISIONS.md
```

## Design tokens
Brand: violet-600 `#7B14FF`, violet-700 `#5B0FD0`, violet-100 `#E9DEFF`, violet-50 `#F5F0FF`, ink `#121214`, night `#140B2B`, night-2 `#1F1247`. Kid feedback only: sun `#FFD23F` (XP), mint `#1FD6A0` (correct), coral `#FF5C7A` (oops, never red-alarm), sky `#38BDF8` (hints). White on violet-600; ink on sun, mint, sky and light surfaces; never ink on violet. WCAG AA everywhere.
Fonts: Outfit 800/900 (display, `font-display`) and Lexend 400–600 (body). Type scale: 12/14/16/18/22/28/36/48/64. Sentence case.
Band themes via `data-band="explore|build|launch"`, which remaps `--bg/--surface/--text/--accent/--radius`. Use the semantic Tailwind colours (`bg-bg`, `bg-surface`, `text-text`, `text-muted`, `bg-accent`, `rounded-band`) in kid UI so themes apply automatically.
HQ: calm and dense; white, small type, no mascot, no confetti.
Logo: OFF in ink (white on dark), BOOK in violet. Never recolour or stretch.

## Data and security
- `students.band` is generated from `class_grade` (6–8 explore, 9–10 build, 11–12 launch). `content_level` (1–3) is placement plus progress (`lib/bands.ts`).
- The course path: `courses.level` + `order_index` (fixed steps) or `slot_id` (choice slots: pick one). One active course at a time. Unlocks are decided server-side only.
- Students have no auth user. The child session is the parent session plus a signed `ob_student` cookie (`lib/student-session.ts`). PINs are hashed in Postgres; use `set_student_pin` and `verify_student_pin`.
- Staff roles: admin, sales, marketing, ops, content, teacher, reviewer, viewer. `public.is_staff(roles)` in SQL (admins always pass) mirrors `requireStaff(roles)` in TS. Enforce in both places; hiding a menu item is not security.
- The service role (`createAdminClient`) only goes in trusted server code; write `audit_log` (`write_audit`) for overrides, refunds, exports, role changes and child-record access.
- Money is in paise (integer). The price comes from `plans`, never from code.

## Commands
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm test` · `npm run test:db` · `npm run db:push` · `npm run db:types` · `npm run seed` · `npm run seed:reset`

## Phases (PRD §16 + mapping)
0. Foundation: scaffold, tokens, bands, logo, Kube, identity and content migrations with RLS, auth, role guards, seed skeleton.
1. Marketing site, parent onboarding (consent, child profiles), Razorpay test checkout, receipts, coupons and school codes.
2. Student core: Today, Journey (map, skill graph, connect-the-dots), lesson player, question engine, XP/levels/ranks/streaks/badges, unlock engine (slots, moving up early, Bridge), Retry Vault, Daily Warm-up. Seed Money Mint and Critical Thinking.
3. HQ Content Studio (editors, Mux upload, preview-as-student), students and subscriptions, audit log.
4. Games (Budget Bazaar, Decision Dojo), challenges, review queue, portfolio, certificates, leagues, Showcase.
5. CRM (pipelines, activities, lead capture, automations) and reports.
6. Remaining games, Locker, PWA, accessibility and performance passes, launch checklist.
7. Coding workspaces (Blockly, Pyodide, web editor, sql.js) and Level 2/3 content.
